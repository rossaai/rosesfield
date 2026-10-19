import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#video-edit/app"
import {
  sixteenFpsFrames,
  sixteenFpsOutput,
} from "#video-edit/comfy/clip-at-sixteen-fps"
import {
  type Recording,
  ReplayFetch,
} from "../../../generation/test/infrastructure/replay-fetch"
import {
  engineCases,
  graphProblemsOf,
  planted,
  seed,
  uploadedClip,
  valueProblemsOf,
  type Workflow,
} from "./video-edit-cases"

const videoEdit = appDefinition.parse(app)
const cloudUrl = "https://cloud.comfy.org"
const jobId = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f"
const clipId = assetIdFormat.parse("4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a")
const runKey = "6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c"

const clipFile: EngineFile = {
  assetId: clipId,
  kind: "video",
  mime: "video/mp4",
  bytes: Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70),
}

const uploaded: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/assets`,
  status: 201,
  json: { id: uploadedClip, content_type: "video/mp4", created_new: true },
}

const submitted: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: { id: jobId, status: "queued", outputs: [] },
}

function requestFor(inputs: Record<string, unknown>): EngineRequest {
  const parsed = startRunBodyFor(videoEdit).parse({
    inputs: { source: [clipId], ...inputs },
    aspectRatio: "16:9",
  })
  return {
    idempotencyKey: runKey,
    binding: resolveBinding(videoEdit.engine, parsed.inputs),
    inputs: parsed.inputs,
    files: [clipFile],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed,
    outputKind: "video",
  }
}

async function submit(request: EngineRequest, recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(request)
  const job = replay.sent.find((sent) => sent.url.endsWith("/api/v2/jobs"))
  const sent: { workflow: Workflow } = JSON.parse(job?.body ?? "{}")
  return { submission, replay, job, workflow: sent.workflow }
}

async function submitOnce(inputs: Record<string, unknown>) {
  const result = await submit(requestFor(inputs), [uploaded, submitted])
  expect(result.replay.unused()).toEqual([])
  expect(result.job?.headers.get("Idempotency-Key")).toBe(runKey)
  expect(result.submission.ref).toBe(jobId)
  expect(result.submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
  return result
}

describe("the engine requests Video edit sends to Comfy", () => {
  it.each(engineCases.map((one) => ({ ...one, label: one.name })))(
    "$label",
    async ({ inputs, model, expected, plant }) => {
      const { submission, workflow } = await submitOnce(inputs)
      expect(submission.models).toEqual([model])
      expect(graphProblemsOf(workflow)).toEqual([])
      expect(valueProblemsOf(workflow, expected)).toEqual([])
      expect(valueProblemsOf(planted(workflow, plant), expected)).toEqual([
        `node ${plant.node} ${plant.input} is ${JSON.stringify(plant.value)}, not ${JSON.stringify(expected[plant.node]?.[plant.input])}`,
      ])
    }
  )

  it("fills each operation's defaults: 3 seconds at 480p, 1:1 at 480p, green and 2x", async () => {
    const cases = [
      { inputs: { mode: "extend" }, node: "98", input: "length", value: 49 },
      { inputs: { mode: "reframe" }, node: "12", input: "value", value: 480 },
      { inputs: { mode: "reframe" }, node: "13", input: "value", value: 480 },
      {
        inputs: { mode: "background" },
        node: "10",
        input: "color",
        value: 0x00b140,
      },
      {
        inputs: { mode: "frame-rate" },
        node: "9",
        input: "multiplier",
        value: 2,
      },
    ]
    for (const one of cases) {
      const { workflow } = await submitOnce(one.inputs)
      expect(workflow[one.node]?.inputs[one.input]).toBe(one.value)
    }
  })

  it("takes the clip's frames at 16 frames per second, at most 81 of them, in Extend and Reframe", async () => {
    for (const mode of ["extend", "reframe"]) {
      const { workflow } = await submitOnce({ mode })
      const picks = Object.values(workflow).filter(
        (node) =>
          node.class_type === "ImageFromBatch" &&
          Array.isArray(node.inputs.batch_index)
      )
      expect(picks).toHaveLength(sixteenFpsFrames)
      expect(workflow["340"]?.inputs).toEqual({
        expression: "floor(40 * a / 16)",
        "values.a": ["2", 2],
      })
      expect(workflow["503"]?.inputs).toMatchObject({
        expression: "min(81, floor((b - 1) * 16 / a) + 1)",
        "values.b": ["3", 2],
      })
    }
  })

  it("keeps the clip's own frames in Background and Frame rate", async () => {
    for (const mode of ["background", "frame-rate"]) {
      const { workflow } = await submitOnce({ mode })
      expect(workflow[sixteenFpsOutput]).toBeUndefined()
    }
  })

  it("sends each operation its own workflow", async () => {
    const hashes = await Promise.all(
      ["extend", "reframe", "background", "frame-rate"].map(async (mode) => {
        const { submission } = await submitOnce({ mode })
        return submission.workflowHash
      })
    )
    expect(new Set(hashes).size).toBe(4)
  })

  it.each([
    { mode: "extend", other: { color: "black" } },
    { mode: "reframe", other: { seconds: 2 } },
    { mode: "background", other: { resolution: "720p" } },
    { mode: "frame-rate", other: { aspect: "9-16" } },
  ])(
    "control: a $mode request that carries another operation's input never reaches the engine",
    ({ mode, other }) => {
      expect(() => requestFor({ mode, ...other })).toThrow()
    }
  )

  it("control: the graph check names a planted link to a missing node and a planted node from a pack", async () => {
    const { workflow } = await submitOnce({ mode: "frame-rate" })
    const broken: Workflow = {
      ...workflow,
      "9": {
        class_type: "FrameInterpolate",
        inputs: { ...workflow["9"]?.inputs, images: ["77", 0] },
      },
      "99": { class_type: "VHS_LoadVideo", inputs: {} },
    }
    expect(graphProblemsOf(broken)).toEqual([
      "node 9 links to the missing node 77",
      "node 99 is VHS_LoadVideo, not a core node",
    ])
  })

  it("control: a submission with no recorded upload fails and sends no job", async () => {
    const replay = new ReplayFetch([submitted])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: replay.fetch,
    })
    await expect(
      engine.submit(requestFor({ mode: "extend" }))
    ).rejects.toThrow()
    expect(replay.sent.some((sent) => sent.url.endsWith("/api/v2/jobs"))).toBe(
      false
    )
  })
})
