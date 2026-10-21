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
  type Recording,
  ReplayFetch,
} from "../../../generation/test/infrastructure/replay-fetch"
import { withoutVideoStills } from "../workflows/video-stills"
import {
  engineCases,
  graphProblemsOf,
  ltxPackNodes,
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

const graphModels: Readonly<Record<string, string>> = {
  extend: "ltx-2-5",
  reframe: "ltx-2-3-outpaint",
  background: "birefnet",
  "frame-rate": "film",
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
  return {
    submission,
    replay,
    job,
    workflow: withoutVideoStills(sent.workflow),
  }
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
      const packs = inputs.mode === "reframe" ? ltxPackNodes : new Set<string>()
      expect(graphProblemsOf(workflow, packs)).toEqual([])
      expect(valueProblemsOf(workflow, expected)).toEqual([])
      expect(valueProblemsOf(planted(workflow, plant), expected)).toEqual([
        `node ${plant.node} ${plant.input} is ${JSON.stringify(plant.value)}, not ${JSON.stringify(expected[plant.node]?.[plant.input])}`,
      ])
    }
  )

  it("fills each graph's defaults: 2 seconds at 480p, 1:1 at 480p, green and 2x", async () => {
    const cases = [
      {
        inputs: { mode: "extend", model: "ltx-2-5" },
        node: "1008",
        input: "expression",
        value: "round(2 * a / 8) * 8 + 1",
      },
      {
        inputs: { mode: "reframe", model: "ltx-2-3-outpaint" },
        node: "12",
        input: "value",
        value: 480,
      },
      {
        inputs: { mode: "reframe", model: "ltx-2-3-outpaint" },
        node: "13",
        input: "value",
        value: 480,
      },
      {
        inputs: { mode: "background", model: "birefnet" },
        node: "10",
        input: "color",
        value: 0x00b140,
      },
      {
        inputs: { mode: "frame-rate", model: "film" },
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

  it("sends each graph its own workflow", async () => {
    const hashes = await Promise.all(
      Object.entries(graphModels).map(async ([mode, model]) => {
        const { submission } = await submitOnce({ mode, model })
        return submission.workflowHash
      })
    )
    expect(new Set(hashes).size).toBe(4)
  })

  it("sends no Wan model and no partner node in any graph", async () => {
    for (const [mode, model] of Object.entries(graphModels)) {
      const { submission, workflow } = await submitOnce({ mode, model })
      expect(submission.models.join(" ")).not.toMatch(/wan/i)
      const files = Object.values(workflow).flatMap((node) =>
        Object.values(node.inputs).filter(
          (value): value is string => typeof value === "string"
        )
      )
      expect(files.filter((file) => /wan/i.test(file))).toEqual([])
    }
  })

  it.each([
    { mode: "extend", model: "ltx-2-5", other: { color: "black" } },
    { mode: "reframe", model: "ltx-2-3-outpaint", other: { seconds: 2 } },
    { mode: "background", model: "birefnet", other: { resolution: "720p" } },
    { mode: "frame-rate", model: "film", other: { aspect: "9-16" } },
    { mode: "extend", model: "film", other: {} },
  ])(
    "control: a $mode request on $model that carries another operation's input or graph never reaches the engine",
    ({ mode, model, other }) => {
      expect(() => requestFor({ mode, model, ...other })).toThrow()
    }
  )

  it("control: the graph check names a planted link to a missing node and a planted node from a pack", async () => {
    const { workflow } = await submitOnce({ mode: "frame-rate", model: "film" })
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
      engine.submit(requestFor({ mode: "extend", model: "ltx-2-5" }))
    ).rejects.toThrow()
    expect(replay.sent.some((sent) => sent.url.endsWith("/api/v2/jobs"))).toBe(
      false
    )
  })
})
