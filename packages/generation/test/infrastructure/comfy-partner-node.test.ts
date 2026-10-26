import { describe, expect, it } from "vitest"
import type { EngineRequest } from "#domain/generation-engine.port"
import {
  comfyWorkflow,
  parseComfyWorkflow,
  partnerNodesOf,
} from "#infrastructure/comfy/comfy-workflow-binding"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { pngBytes, referenceId } from "../sample"
import {
  comfyV2,
  comfyV2At,
  jobId,
  proxyUrl,
  succeededJob,
  workflowBinding,
} from "./fixtures/comfy-v2"
import { type Recording, ReplayFetch } from "./replay-fetch"

const key = "comfyui-partner-test"

const partnerBinding = comfyWorkflow({
  workflow: {
    "1": { class_type: "LoadImage", inputs: { image: "" } },
    "2": {
      class_type: "MeshyImageToModelNode",
      inputs: { model: "meshy-7.1", image: ["1", 0], seed: 0 },
    },
    "3": {
      class_type: "SaveGLB",
      inputs: { mesh: ["2", 2], filename_prefix: "3d/Rosesfield" },
    },
  },
  bindings: [
    {
      from: "input",
      name: "image",
      index: 0,
      path: ["1", "inputs", "image"],
    },
    { from: "seed", path: ["2", "inputs", "seed"] },
  ],
  outputsPerJob: "one",
  partnerNodes: ["MeshyImageToModelNode"],
})

function requestFor(binding: EngineRequest["binding"]): EngineRequest {
  return {
    idempotencyKey: "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a",
    binding,
    inputs: { image: [referenceId], prompt: "a chair" },
    files: [
      {
        assetId: referenceId,
        kind: "image",
        mime: "image/png",
        bytes: pngBytes(),
      },
    ],
    count: 1,
    aspectRatio: "1:1",
    seed: 42,
    outputKind: "mesh",
  }
}

function engineFor(recordings: Recording[], apiKey: string | null = key) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({ apiKey, fetch: replay.fetch })
  return { engine, replay }
}

function jobBody(replay: ReplayFetch): Record<string, unknown> {
  const body = replay.sent.find((sent) => sent.url.endsWith("/jobs"))?.body
  return JSON.parse(body ?? "{}")
}

describe("a graph that runs a Comfy partner node", () => {
  it("sends your key to the partner node as extra_data on the submit", async () => {
    const { engine, replay } = engineFor([comfyV2.upload(), comfyV2.submit()])
    await engine.submit(requestFor(partnerBinding))
    const body = jobBody(replay)
    expect(body.extra_data).toEqual({ api_key_comfy_org: key })
    expect(body.workflow).toMatchObject({
      "2": { inputs: { seed: 42, model: "meshy-7.1" } },
    })
  })

  it("sends no extra_data for a graph with no partner node, the control", async () => {
    const { engine, replay } = engineFor([comfyV2.upload(), comfyV2.submit()])
    await engine.submit({
      ...requestFor(workflowBinding),
      inputs: { prompt: "a red door", references: [referenceId] },
    })
    expect(Object.keys(jobBody(replay))).toEqual(["workflow"])
  })

  it("sends no extra_data when the engine holds no key", async () => {
    const proxy = comfyV2At(proxyUrl)
    const replay = new ReplayFetch([proxy.upload(), proxy.submit()])
    const engine = new ComfyGenerationEngine({
      apiKey: null,
      baseUrl: proxyUrl,
      fetch: replay.fetch,
    })
    await engine.submit(requestFor(partnerBinding))
    expect(jobBody(replay).extra_data).toBeUndefined()
  })

  it("refuses a binding that names a partner node its graph lacks", () => {
    const binding = comfyWorkflow({
      ...parseComfyWorkflow(partnerBinding),
      partnerNodes: ["TripoImageToModelNode"],
    })
    expect(() => parseComfyWorkflow(binding)).toThrow(/partner node/)
  })

  it("reads the partner nodes of a binding, and none of another adapter", () => {
    expect(partnerNodesOf(partnerBinding)).toEqual(["MeshyImageToModelNode"])
    expect(partnerNodesOf(workflowBinding)).toEqual([])
    expect(partnerNodesOf({ adapter: "task", config: {} })).toEqual([])
  })

  it("reports no GPU-second price for a partner run with no balance reading, and the GPU price for a graph", async () => {
    const partner = engineFor([
      comfyV2.upload(),
      comfyV2.submit(),
      comfyV2.read(succeededJob),
    ])
    await partner.engine.submit(requestFor(partnerBinding))
    expect(await partner.engine.read(jobId)).toEqual({
      state: "succeeded",
      cost: null,
    })
    const graph = engineFor([comfyV2.read(succeededJob)])
    const status = await graph.engine.read(jobId)
    expect(status).toMatchObject({ state: "succeeded" })
    expect(status.state === "succeeded" ? status.cost : null).not.toBeNull()
  })
})
