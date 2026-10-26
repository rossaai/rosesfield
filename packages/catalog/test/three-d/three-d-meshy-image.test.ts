import type { EngineBinding } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { partnerNodesOf } from "@rosesfield/generation/bindings"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { findWorkflow } from "#list-workflows"
import { meshyImageBinding, threeDEngine } from "#three-d/comfy/three-d-engine"
import {
  graphModel,
  meshyImageModel,
  meshyImageWorkflow,
  textModel,
} from "#three-d/three-d-models"
import { cloudNodes, recordedFrom } from "./cloud-nodes"

const cloudUrl = "https://cloud.comfy.org"
const key = "comfyui-three-d-test"
const jobId = "5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d8e"
const photoId = assetIdFormat.parse("6c7d8e9f-0a1b-4c2d-9e3f-4a5b6c7d8e9f")
const uploadedId = "7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a"
const outputId = "8e9f0a1b-2c3d-4e4f-9a5b-6c7d8e9f0a1b"

type Recording = {
  method: "GET" | "POST"
  url: string
  status: number
  json?: unknown
  bytes?: Uint8Array
}

class ReplayFetch {
  readonly sent: { url: string; body: string | null }[] = []
  private readonly pending: Recording[]

  constructor(recordings: readonly Recording[]) {
    this.pending = [...recordings]
  }

  readonly fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const index = this.pending.findIndex(
      (one) => one.method === method && one.url === url
    )
    const recording = this.pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    this.sent.push({
      url,
      body: typeof init?.body === "string" ? init.body : null,
    })
    if (recording.bytes !== undefined) {
      return new Response(recording.bytes.slice(), {
        status: recording.status,
        headers: { "Content-Type": "model/gltf-binary" },
      })
    }
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
}

function job(status: string, outputs: unknown[] = []): unknown {
  return {
    id: jobId,
    status,
    created_at: "2026-10-26T09:00:00Z",
    started_at: status === "queued" ? null : "2026-10-26T09:00:04Z",
    completed_at: status === "succeeded" ? "2026-10-26T09:02:31Z" : null,
    expires_at: "2026-10-27T09:00:00Z",
    queue_position: null,
    progress: null,
    metrics: { queue_ms: 4000, execution_ms: 147_000 },
    outputs,
    error: null,
    urls: {
      self: `/api/v2/jobs/${jobId}`,
      events: `/api/v2/jobs/${jobId}/events`,
      cancel: `/api/v2/jobs/${jobId}/cancel`,
    },
  }
}

const upload: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/assets`,
  status: 201,
  json: {
    id: uploadedId,
    hash: "blake3:7d8e9f0a",
    size_bytes: 12,
    content_type: "image/png",
    file_path: `${photoId}.png`,
    created_new: true,
    created_at: "2026-10-26T09:00:00Z",
    url: `${cloudUrl}/api/v2/assets/${uploadedId}/content`,
    url_expires_at: "2026-10-26T10:00:00Z",
  },
}

const submit: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: job("queued"),
}

function glbBytes(): Uint8Array {
  const json = new TextEncoder().encode('{"asset":{"version":"2.0"}} ')
  const bytes = new Uint8Array(20 + json.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, bytes.length, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  return bytes
}

const savedGlb = {
  node_id: "3",
  name: "3d/three-d-meshy-image_00001_.glb",
  type: "3d",
  content_type: "model/gltf-binary",
  size_bytes: 48,
  id: outputId,
  hash: null,
  url: `https://storage.comfy.org/signed/${outputId}`,
  url_expires_at: "2026-10-26T10:00:00Z",
  job_id: jobId,
}

const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)

function requestFor(model: string): EngineRequest {
  const inputs = { model, image: [photoId] }
  return {
    idempotencyKey: "9f0a1b2c-3d4e-4f5a-8b6c-7d8e9f0a1b2c",
    binding: resolveBinding(threeDEngine(textModel), inputs),
    inputs,
    files: [
      { assetId: photoId, kind: "image", mime: "image/png", bytes: photo },
    ],
    count: 1,
    aspectRatio: null,
    seed: 7,
    outputKind: "mesh",
  }
}

const sentBody = z.object({
  workflow: z.record(
    z.string(),
    z.object({
      class_type: z.string(),
      inputs: z.record(z.string(), z.unknown()),
    })
  ),
  extra_data: z.record(z.string(), z.unknown()).optional(),
})

function sentJob(replay: ReplayFetch): z.infer<typeof sentBody> {
  const body = replay.sent.find((one) => one.url.endsWith("/jobs"))?.body
  return sentBody.parse(JSON.parse(body ?? "{}"))
}

const nodeOf = z.object({
  class_type: z.string(),
  inputs: z.record(z.string(), z.unknown()),
})

const graph = z
  .record(z.string(), nodeOf)
  .parse(findWorkflow(meshyImageWorkflow)?.graph)

describe(`Rosesfield's Meshy graph against ${recordedFrom}`, () => {
  it("loads the photo, runs Meshy 7.1 on it and saves the GLB output it returns", () => {
    expect(graph).toMatchObject({
      "1": { class_type: "LoadImage", inputs: { image: "" } },
      "2": {
        class_type: "MeshyImageToModelNode",
        inputs: { model: "meshy-7.1", image: ["1", 0] },
      },
      "3": { class_type: "SaveGLB", inputs: { mesh: ["2", 2] } },
    })
    const outputs = cloudNodes.MeshyImageToModelNode?.outputs ?? []
    expect(outputs[2]).toBe("FILE_3D_GLB")
  })

  it("gives the Meshy node every input Cloud requires, with remesh, symmetry and texture at their defaults", () => {
    const inputs = graph["2"]?.inputs ?? {}
    const required = cloudNodes.MeshyImageToModelNode?.required ?? []
    expect(required.filter((name) => !Object.hasOwn(inputs, name))).toEqual([])
    expect(inputs).toMatchObject({
      should_remesh: "true",
      "should_remesh.topology": "triangle",
      "should_remesh.target_polycount": 30_000,
      symmetry_mode: "auto",
      should_texture: "true",
      "should_texture.enable_pbr": false,
      "should_texture.texture_prompt": "",
      "should_texture.texture_resolution": "2k",
      ultra_mode: false,
    })
  })

  it("declares its partner node, so the engine sends your key with it", () => {
    expect(partnerNodesOf(meshyImageBinding)).toEqual(["MeshyImageToModelNode"])
    const resolved: EngineBinding = resolveBinding(threeDEngine(textModel), {
      model: meshyImageModel,
    })
    expect(resolved.config).toBe(meshyImageBinding.config)
  })
})

describe("a 3D run from a photo on Meshy", () => {
  it("submits your photo to the graph with your key for the partner node", async () => {
    const replay = new ReplayFetch([upload, submit])
    const engine = new ComfyGenerationEngine({
      apiKey: key,
      fetch: replay.fetch,
    })
    await engine.submit(requestFor(meshyImageModel))
    const sent = sentJob(replay)
    expect(sent.extra_data).toEqual({ api_key_comfy_org: key })
    expect(sent.workflow["1"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(sent.workflow["2"]?.inputs).toMatchObject({
      model: "meshy-7.1",
      seed: 7,
    })
  })

  it("sends no key with the Pixal3D graph, which runs no partner node, the control", async () => {
    const replay = new ReplayFetch([upload, submit])
    const engine = new ComfyGenerationEngine({
      apiKey: key,
      fetch: replay.fetch,
    })
    await engine.submit(requestFor(graphModel))
    expect(sentJob(replay).extra_data).toBeUndefined()
  })

  it("keeps the GLB the recorded run saves as a mesh", async () => {
    const replay = new ReplayFetch([
      {
        method: "GET",
        url: `${cloudUrl}/api/v2/jobs/${jobId}`,
        status: 200,
        json: job("succeeded", [savedGlb]),
      },
      {
        method: "GET",
        url: `${cloudUrl}/api/v2/assets/${outputId}/content`,
        status: 200,
        bytes: glbBytes(),
      },
    ])
    const engine = new ComfyGenerationEngine({
      apiKey: key,
      fetch: replay.fetch,
    })
    const outputs = await engine.listOutputs(jobId)
    expect(outputs).toEqual([
      expect.objectContaining({ kind: "mesh", mime: "model/gltf-binary" }),
    ])
  })
})
