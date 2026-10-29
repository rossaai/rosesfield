import { ComfyGenerationEngine } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import { planClip } from "#motion/clip-plan"
import {
  readClipOutputNodes,
  readClipRequestOf,
  readClipWorkflow,
} from "#motion/comfy/read-clip-binding"
import { withoutVideoStills } from "../../workflows/video-stills"
import {
  type Graph,
  graphSchema,
  linksToMissingNodes,
  ReplayFetch,
} from "../motion-replay"
import { twoTargetPlan } from "./clip-plan-answers"

const cloudUrl = "https://cloud.comfy.org"
const clipId = assetIdFormat.parse("5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f")
const clipUpload = "6d7e8f9a-0b1c-4d2e-9f3a-4b5c6d7e8f90"
const jobId = "7e8f9a0b-1c2d-4e3f-8a4b-5c6d7e8f9a01"

function fileGraph(): Graph {
  const workflow = findWorkflow(readClipWorkflow)
  if (workflow === null) {
    throw new Error(`workflows/${readClipWorkflow} is not listed`)
  }
  return graphSchema.parse(structuredClone(workflow.graph))
}

async function sentGraph(): Promise<{ graph: Graph; replay: ReplayFetch }> {
  const request = readClipRequestOf({
    runId: "run-1",
    clip: clipId,
    plan: planClip(twoTargetPlan, 3),
    seed: 41,
  })
  const replay = new ReplayFetch([
    {
      method: "POST",
      url: `${cloudUrl}/api/v2/assets`,
      status: 201,
      json: { id: clipUpload, content_type: "video/mp4", created_new: true },
    },
    {
      method: "POST",
      url: `${cloudUrl}/api/v2/jobs`,
      status: 201,
      json: { id: jobId, status: "queued", outputs: [] },
    },
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  await engine.submit({
    idempotencyKey: request.idempotencyKey,
    binding: request.binding,
    inputs: request.inputs,
    files: [
      {
        assetId: clipId,
        kind: "video",
        mime: "video/mp4",
        bytes: Uint8Array.of(0, 0, 0, 24),
      },
    ],
    count: 1,
    aspectRatio: null,
    seed: request.seed,
    outputKind: "video",
  })
  const body = replay.sent.find((one) => one.url.endsWith("/jobs"))?.body
  const workflow =
    typeof body === "object" && body !== null && "workflow" in body
      ? body.workflow
      : null
  return { graph: withoutVideoStills(graphSchema.parse(workflow)), replay }
}

function linkOf(graph: Graph, id: string, name: string): unknown {
  return graph[id]?.inputs[name]
}

describe("the graph that reads a clip", () => {
  it("sends the clip as an uploaded asset and the plan's targets as the tracker's text, under the step's key", async () => {
    const { graph, replay } = await sentGraph()
    expect(linkOf(graph, "1", "file")).toEqual({
      __type: "core/ASSET",
      info: { id: clipUpload },
    })
    expect(linkOf(graph, "21", "text")).toBe(
      "the man in the grey coat, the bottle in his right hand"
    )
    const job = replay.sent.find((one) => one.url.endsWith("/jobs"))
    expect(job?.headers.get("Idempotency-Key")).toBe("run-1-read")
    expect(linksToMissingNodes(graph)).toEqual([])
  })

  it("control: every other node leaves the file as it is", async () => {
    const { graph } = await sentGraph()
    const file = fileGraph()
    for (const [id, node] of Object.entries(graph)) {
      if (id !== "1" && id !== "21") {
        expect(node).toEqual(file[id])
      }
    }
    expect(Object.keys(graph).sort()).toEqual(Object.keys(file).sort())
  })

  it("feeds the depth, the tracker and the first frame from the same scaled frames", () => {
    const graph = fileGraph()
    const frames = ["7", 0]
    expect(linkOf(graph, "11", "images")).toEqual(frames)
    expect(linkOf(graph, "22", "images")).toEqual(frames)
    expect(linkOf(graph, "30", "image")).toEqual(frames)
    expect(linkOf(graph, "5", "expression")).toBe("min(768, min(a, b))")
    expect(linkOf(graph, "2", "duration")).toBe(10)
  })

  it("reads depth with Depth Anything 3 Mono-Large, near white, and tracks with SAM 3.1 from the text", () => {
    const graph = fileGraph()
    expect(graph["10"]?.inputs.model).toBe("da3mono_large.safetensors")
    expect(graph["11"]?.inputs).toMatchObject({
      normalization_mode: "V2-Style",
      invert_depth: false,
    })
    expect(graph["20"]?.inputs.ckpt_name).toBe(
      "sam3.1_multiplex_fp16.safetensors"
    )
    expect(graph["21"]?.inputs.clip).toEqual(["20", 1])
    expect(graph["22"]?.inputs).toMatchObject({
      model: ["20", 0],
      conditioning: ["21", 0],
      max_objects: 3,
    })
  })

  it("saves the depth, a hard matte the render grows itself, and the first frame, at the clip's frame rate", () => {
    const graph = fileGraph()
    expect(graph[readClipOutputNodes.depth]?.class_type).toBe("SaveVideo")
    expect(graph[readClipOutputNodes.mask]?.class_type).toBe("SaveVideo")
    expect(graph[readClipOutputNodes.firstFrame]?.class_type).toBe("SaveImage")
    expect(linkOf(graph, "12", "images")).toEqual(["11", 0])
    expect(linkOf(graph, "25", "mask")).toEqual(["23", 0])
    expect(linkOf(graph, "27", "images")).toEqual(["25", 0])
    expect(linkOf(graph, "12", "fps")).toEqual(["3", 2])
    expect(linkOf(graph, "27", "fps")).toEqual(["3", 2])
    const classes = Object.values(graph).map((node) => node.class_type)
    expect(classes).not.toContain("GrowMask")
    expect(classes).not.toContain("ImageBlur")
  })

  it("lists its model files and its one node pack in its entry", () => {
    const workflow = findWorkflow(readClipWorkflow)
    expect(workflow?.models).toEqual([
      "da3mono_large.safetensors",
      "sam3.1_multiplex_fp16.safetensors",
    ])
    expect(workflow?.partnerNodes).toEqual([])
  })
})
