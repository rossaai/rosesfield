import { type RunInputs, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#edit/app"
import { readApps } from "#list-apps"

type Node = { class_type: string; inputs: Record<string, unknown> }
type Workflow = Record<string, Node>
type Recording = { status: number; json: unknown }
type Sent = { method: string; url: string; body: string | null }

const cloud = "https://cloud.comfy.org"
const jobId = "5b7d9f1a-3c5e-4a7c-9e1a-3c5e7a9b1d3f"
const uploadedId = "7d9f1b3d-5a7c-4e9a-8c1d-5a7c9e1b3d5f"
const photoId = assetIdFormat.parse("3c5e7a9b-1d3f-4b5d-9f1b-3d5f7b9d1f3b")
const [edit] = readApps([{ folder: "edit", app }])
const graphFiles = [
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  "qwen_image_edit_2511_fp8mixed.safetensors",
  "qwen_image_vae.safetensors",
]

const upload: Recording = {
  status: 201,
  json: {
    id: uploadedId,
    hash: "blake3:7d9f1b3d",
    size_bytes: 8,
    content_type: "image/png",
    file_path: `${photoId}.png`,
    created_new: true,
    created_at: "2026-10-20T09:00:00Z",
  },
}

const queued: Recording = {
  status: 201,
  json: {
    id: jobId,
    status: "queued",
    created_at: "2026-10-20T09:00:00Z",
    queue_position: 1,
    progress: null,
    outputs: [],
    error: null,
  },
}

const recordings: Readonly<Record<string, Recording>> = {
  [`POST ${cloud}/api/v2/assets`]: upload,
  [`POST ${cloud}/api/v2/jobs`]: queued,
}

function replay(recorded: Readonly<Record<string, Recording>>) {
  const sent: Sent[] = []
  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const recording = recorded[`${method} ${url}`]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    sent.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { sent, fetch }
}

function requestFor(inputs: Record<string, unknown>): EngineRequest {
  if (edit === undefined) {
    throw new Error("The edit app did not parse")
  }
  const parsed = startRunBodyFor(edit).parse({
    inputs: { image: [photoId], prompt: "make the jacket red", ...inputs },
  })
  const runInputs: RunInputs = { ...parsed.inputs }
  return {
    idempotencyKey: "9f1b3d5f-7b9d-4f1b-a3d5-f7b9d1f3b5d7",
    binding: resolveBinding(edit.engine, parsed.inputs),
    inputs: runInputs,
    files: [
      {
        assetId: photoId,
        kind: "image",
        mime: "image/png",
        bytes: new Uint8Array(8),
      },
    ],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 4242,
    outputKind: "image",
  }
}

async function submitted(
  inputs: Record<string, unknown>,
  recorded = recordings
) {
  const { sent, fetch } = replay(recorded)
  const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch })
  const request = requestFor(inputs)
  const submission = await engine.submit(request)
  const job = sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  const workflow: Workflow = JSON.parse(job?.body ?? "{}").workflow
  return { sent, submission, workflow, engine, request }
}

function linkOf(value: unknown): string | null {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
    ? value[0]
    : null
}

function danglingLinks(workflow: Workflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.values(node.inputs)
      .map(linkOf)
      .filter((target) => target !== null && workflow[target] === undefined)
      .map((target) => `${id} -> ${target}`)
  )
}

function latentSource(workflow: Workflow): string {
  const sampler = Object.values(workflow).find(
    (node) => node.class_type === "KSampler"
  )
  const latent = workflow[linkOf(sampler?.inputs.latent_image) ?? ""]
  if (latent?.class_type !== "VAEEncode") {
    return latent?.class_type ?? "none"
  }
  const pixels = workflow[linkOf(latent.inputs.pixels) ?? ""]
  const photo = workflow[linkOf(pixels?.inputs.image) ?? ""]
  return `${pixels?.class_type} of ${photo?.class_type}`
}

describe("the Edit engine request on the Qwen Image Edit 2511 graph", () => {
  it("sends your photo, your words and the smallest size, and draws on your scaled photo", async () => {
    const { workflow, submission, sent } = await submitted({
      resolution: "small",
    })
    expect(workflow["41"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(workflow["112"]?.inputs.prompt).toBe("make the jacket red")
    expect(workflow["100"]?.inputs.prompt).toBe("")
    expect(workflow["107"]?.inputs).toMatchObject({
      image: ["41", 0],
      megapixels: 0.5,
      resolution_steps: 16,
    })
    expect(latentSource(workflow)).toBe("ImageScaleToTotalPixels of LoadImage")
    expect(workflow["106"]?.inputs).toMatchObject({
      seed: 4242,
      steps: 40,
      cfg: 4,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1,
    })
    expect([...submission.models].sort()).toEqual(graphFiles)
    expect(sent.map((one) => `${one.method} ${one.url}`)).toEqual([
      `POST ${cloud}/api/v2/assets`,
      `POST ${cloud}/api/v2/jobs`,
    ])
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("sends 1 megapixel when a run names no size", async () => {
    const { workflow } = await submitted({})
    expect(workflow["107"]?.inputs.megapixels).toBe(1)
  })

  it("makes one output per job, so a Count of 2 runs 2 seeds", async () => {
    const { engine, request } = await submitted({})
    expect(engine.outputsPerJob(request.binding)).toBe("one")
  })

  it("finds a latent that does not come from your photo, the control", async () => {
    const { workflow } = await submitted({})
    const planted = structuredClone(workflow)
    planted["200"] = {
      class_type: "EmptySD3LatentImage",
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    }
    const sampler = planted["106"]
    if (sampler === undefined) {
      throw new Error("The graph has no sampler")
    }
    sampler.inputs = { ...sampler.inputs, latent_image: ["200", 0] }
    expect(latentSource(planted)).toBe("EmptySD3LatentImage")
  })

  it("throws on a request it has no recording for, so nothing reaches Comfy", async () => {
    const withoutUpload: Readonly<Record<string, Recording>> = {
      [`POST ${cloud}/api/v2/jobs`]: queued,
    }
    await expect(submitted({}, withoutUpload)).rejects.toThrow(
      expect.objectContaining({ code: "ENGINE_UNAVAILABLE" })
    )
  })
})
