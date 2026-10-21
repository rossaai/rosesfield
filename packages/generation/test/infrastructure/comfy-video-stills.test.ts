import { describe, expect, it } from "vitest"
import { isBlankOutput } from "#application/advance-run/blank-output"
import type { EngineRequest } from "#domain/generation-engine.port"
import { addVideoStills } from "#infrastructure/comfy/comfy-video-stills"
import {
  comfyWorkflow,
  parseComfyWorkflow,
} from "#infrastructure/comfy/comfy-workflow-binding"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { pngBytes } from "../sample"
import { stillsOf, type VideoFixture, videoBytesOf } from "../video-fixtures"
import {
  comfyV2,
  jobId,
  succeededJob,
  workflowBinding,
} from "./fixtures/comfy-v2"
import { type Recording, ReplayFetch } from "./replay-fetch"

const videoGraph = {
  "374": { class_type: "VAEDecodeTiled", inputs: { samples: ["465", 2] } },
  "380": {
    class_type: "ImageScale",
    inputs: { image: ["374", 0], width: 1280, height: 720 },
  },
  "370": {
    class_type: "CreateVideo",
    inputs: { images: ["380", 0], audio: ["361", 0], fps: 24 },
  },
  "75": {
    class_type: "SaveVideo",
    inputs: { video: ["370", 0], filename_prefix: "video/rosesfield-effects" },
  },
}

const request: EngineRequest = {
  idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
  binding: comfyWorkflow({ workflow: videoGraph, bindings: [] }),
  inputs: {},
  files: [],
  count: 1,
  aspectRatio: null,
  seed: null,
  outputKind: "video",
}

const videoId = "6c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

function stillId(index: number): string {
  return `6c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e5${index}`
}

function outputOf(id: string, node: string, name: string, type: string) {
  const contentType = type === "video" ? "video/mp4" : "image/png"
  return { id, node_id: node, name, type, content_type: contentType }
}

function contentOf(id: string, bytes: Uint8Array): Recording {
  return {
    method: "GET",
    url: `https://cloud.comfy.org/api/v2/assets/${id}/content`,
    status: 200,
    bytes,
  }
}

async function videoJob(fixture: VideoFixture, missing: number | null) {
  const all = await stillsOf(fixture)
  const indexes = [0, 1, 2, 3, 4].filter((index) => index !== missing)
  const stills = indexes.flatMap((index) => all.slice(index, index + 1))
  const outputs = [
    outputOf(videoId, "75", "video/rosesfield-effects_00001_.mp4", "video"),
    ...indexes.map((index) =>
      outputOf(
        stillId(index),
        String(400 + index),
        `rosesfield-stills/rosesfield-still-75-${index}_00001_.png`,
        "image"
      )
    ),
  ]
  const recordings = [
    comfyV2.read({ ...succeededJob, outputs }),
    contentOf(videoId, await videoBytesOf(fixture)),
    ...indexes.map((index, at) =>
      contentOf(stillId(index), stills[at] ?? new Uint8Array(0))
    ),
  ]
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  return { engine, replay, stills }
}

describe("Comfy video stills", () => {
  it("samples five evenly spaced small frames of the batch the video node is made from", () => {
    const graph = addVideoStills(videoGraph)
    const added = Object.entries(graph).filter(([id]) => !(id in videoGraph))
    expect(added).toHaveLength(21)
    expect(graph["381"]).toEqual({
      class_type: "GetImageSize",
      inputs: { image: ["380", 0] },
    })
    const saves = added.filter(([, node]) => isNodeOf(node, "SaveImage"))
    expect(saves).toHaveLength(5)
    const expressions = added.flatMap(([, node]) =>
      isNodeOf(node, "ComfyMathExpression") ? [node.inputs.expression] : []
    )
    expect(expressions).toEqual(
      [0, 1, 2, 3, 4].map((index) => `floor((a - 1) * ${index} / 4)`)
    )
    expect(graph["383"]).toEqual({
      class_type: "ImageFromBatch",
      inputs: { image: ["380", 0], batch_index: ["382", 1], length: 1 },
    })
    expect(graph["384"]).toMatchObject({
      class_type: "ImageScaleToTotalPixels",
      inputs: { image: ["383", 0], megapixels: 0.05 },
    })
    expect(graph["385"]).toMatchObject({
      inputs: {
        images: ["384", 0],
        filename_prefix: "rosesfield-stills/rosesfield-still-75-0",
      },
    })
  })

  it("adds nothing to a graph that saves no video", () => {
    const { workflow } = parseComfyWorkflow(workflowBinding)
    expect(addVideoStills(workflow)).toEqual(workflow)
  })

  it("sends the stills nodes with the workflow it submits", async () => {
    const replay = new ReplayFetch([comfyV2.submit()])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: replay.fetch,
    })
    await engine.submit(request)
    const body = replay.sent.find((sent) => sent.url.endsWith("/jobs"))?.body
    const sent = JSON.parse(body ?? "{}").workflow
    expect(sent).toEqual(addVideoStills(videoGraph))
    expect(Object.keys(sent)).toHaveLength(25)
  })

  it("lists the video with its stills and never lists a still as an output", async () => {
    const { engine, replay, stills } = await videoJob("test-pattern", null)
    const outputs = await engine.listOutputs(jobId)
    expect(replay.unused()).toEqual([])
    expect(outputs).toHaveLength(1)
    expect(outputs[0]).toMatchObject({ kind: "video", mime: "video/mp4" })
    expect(outputs[0]?.stills).toEqual(stills)
    expect(await isBlankOutput(outputs.at(0) ?? never())).toBe(false)
  })

  it("lists a black video whose stills read black, so the run fails it", async () => {
    const { engine } = await videoJob("melt-away-black", null)
    const [video] = await engine.listOutputs(jobId)
    expect(video?.stills).toHaveLength(5)
    expect(await isBlankOutput(video ?? never())).toBe(true)
  })

  it.each([0, 2, 4])(
    "attaches no stills when still %s is missing, so the video is kept",
    async (missing) => {
      const { engine } = await videoJob("melt-away-black", missing)
      const outputs = await engine.listOutputs(jobId)
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).not.toHaveProperty("stills")
      expect(await isBlankOutput(outputs.at(0) ?? never())).toBe(false)
    }
  )

  it("keeps listing an image a graph saves as an output", async () => {
    const replay = new ReplayFetch([
      comfyV2.read(succeededJob),
      comfyV2.content(),
    ])
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: replay.fetch,
    })
    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toHaveLength(1)
    expect(outputs[0]?.bytes).toEqual(pngBytes())
  })
})

function isNodeOf(
  node: unknown,
  type: string
): node is { class_type: string; inputs: Record<string, unknown> } {
  return (
    typeof node === "object" &&
    node !== null &&
    "class_type" in node &&
    node.class_type === type
  )
}

function never(): never {
  throw new Error("No output")
}
