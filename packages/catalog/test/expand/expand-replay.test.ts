import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  Run,
  resolveBinding,
} from "@rosesfield/generation"
import { appIdFormat, assetIdFormat, runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { app } from "#expand/app"

type Recording = {
  method: "GET" | "POST"
  url: string
  status: number
  json: unknown
}

type SentRequest = {
  url: string
  body: string | null
  headers: Headers
}

class ReplayFetch {
  readonly sent: SentRequest[] = []
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
      (recording) => recording.method === method && recording.url === url
    )
    const recording = this.pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    this.sent.push({
      url,
      body: typeof init?.body === "string" ? init.body : null,
      headers: new Headers(init?.headers),
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
}

const cloudUrl = "https://cloud.comfy.org"
const jobId = "6c2e4f8a-3d5b-4b7c-8e9f-1a2b3c4d5e6f"
const uploadedId = "8d3f5a7b-9c1e-4d2f-a3b4-c5d6e7f8a9b0"

const uploadRecording: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/assets`,
  status: 201,
  json: {
    id: uploadedId,
    hash: "blake3:8d3f5a7b",
    size_bytes: 12,
    content_type: "image/png",
    file_path: "photo.png",
    created_new: true,
    created_at: "2026-10-17T09:00:00Z",
    url: `${cloudUrl}/api/v2/assets/${uploadedId}/content`,
    url_expires_at: "2026-10-17T10:00:00Z",
  },
}

const submitRecording: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: {
    id: jobId,
    status: "queued",
    created_at: "2026-10-17T09:00:00Z",
    started_at: null,
    completed_at: null,
    expires_at: "2026-10-18T09:00:00Z",
    queue_position: 1,
    progress: null,
    outputs: [],
    error: null,
    urls: {
      self: `/api/v2/jobs/${jobId}`,
      events: `/api/v2/jobs/${jobId}/events`,
      cancel: `/api/v2/jobs/${jobId}/cancel`,
    },
  },
}

type Node = { class_type: string; inputs: Record<string, unknown> }

type Workflow = Record<string, Node>

const coreClasses = new Set([
  "CLIPLoader",
  "CLIPTextEncode",
  "ComfyMathExpression",
  "ControlNetInpaintingAliMamaApply",
  "ControlNetLoader",
  "GetImageSize",
  "GrowMask",
  "ImageBlur",
  "ImageCompositeMasked",
  "ImagePadForOutpaint",
  "ImageScale",
  "ImageToMask",
  "KSampler",
  "LoadImage",
  "LoraLoaderModelOnly",
  "MaskToImage",
  "ModelSamplingAuraFlow",
  "PrimitiveInt",
  "RepeatImageBatch",
  "SaveImage",
  "UNETLoader",
  "VAEDecode",
  "VAEEncode",
  "VAELoader",
])

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function brokenLinks(workflow: Workflow): string[] {
  const broken: string[] = []
  for (const [id, node] of Object.entries(workflow)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isLink(value) && workflow[value[0]] === undefined) {
        broken.push(`${id}.${name} -> ${value[0]}`)
      }
    }
  }
  return broken
}

function classesOutsideCore(workflow: Workflow): string[] {
  return Object.values(workflow)
    .map((node) => node.class_type)
    .filter((name) => !coreClasses.has(name))
}

const definition = appDefinition.parse(app)
const photoId = assetIdFormat.parse("3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f")
const runId = runIdFormat.parse("4e5f6a7b-8c9d-4e0f-9a1b-2c3d4e5f6a7b")

const photoFile: EngineFile = {
  assetId: photoId,
  kind: "image",
  mime: "image/png",
  bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13),
}

const sentBody = z.object({
  workflow: z.record(
    z.string(),
    z.object({
      class_type: z.string(),
      inputs: z.record(z.string(), z.unknown()),
    })
  ),
})

type Submission = { workflow: Workflow; key: string | null }

function bodyOf(body: Record<string, unknown>) {
  return startRunBodyFor(definition).parse(body)
}

async function submittedRun(
  body: Record<string, unknown>
): Promise<Submission[]> {
  const parsed = bodyOf(body)
  const binding = resolveBinding(definition.engine, parsed.inputs)
  const replay = new ReplayFetch(
    Array.from({ length: parsed.count }, () => [
      uploadRecording,
      submitRecording,
    ]).flat()
  )
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const run = Run.queue({
    id: runId,
    appId: appIdFormat.parse("expand"),
    request: parsed,
    seed: 42,
    adapter: engine.key,
    origin: engine.origin,
    idempotencyKey: null,
    now: new Date("2026-10-17T09:00:00Z"),
    outputsPerJob: engine.outputsPerJob(binding),
  })
  for (const job of run.jobs) {
    const request: EngineRequest = {
      idempotencyKey: run.idempotencyKeyOf(job.index),
      binding,
      inputs: parsed.inputs,
      files: [photoFile],
      count: run.jobs.length === 1 ? parsed.count : 1,
      aspectRatio: parsed.aspectRatio,
      seed: job.seed,
      outputKind: "image",
    }
    expect(await engine.submit(request)).toMatchObject({ ref: jobId })
  }
  return replay.sent
    .filter((sent) => sent.url === `${cloudUrl}/api/v2/jobs`)
    .map((sent) => ({
      workflow: sentBody.parse(JSON.parse(sent.body ?? "{}")).workflow,
      key: sent.headers.get("Idempotency-Key"),
    }))
}

async function onlyWorkflow(body: Record<string, unknown>): Promise<Workflow> {
  const [first, ...rest] = await submittedRun(body)
  expect(rest).toEqual([])
  if (first === undefined) {
    throw new Error("No job was submitted")
  }
  return first.workflow
}

const loaded = { __type: "core/ASSET", info: { id: uploadedId } }

describe("the Expand engine request", () => {
  it("submits one To a format job per output, each with its own seed and key", async () => {
    const jobs = await submittedRun({
      inputs: { mode: "format", photo: [photoId], aspect: "16-9" },
      aspectRatio: "16:9",
      count: 2,
    })
    expect(jobs.map((job) => job.key)).toEqual([`${runId}-0`, `${runId}-1`])
    expect(jobs.map((job) => job.workflow["41"]?.inputs.seed)).toEqual([42, 43])
    for (const { workflow } of jobs) {
      expect(workflow).toMatchObject({
        "1": { class_type: "LoadImage", inputs: { image: loaded } },
        "7": { class_type: "PrimitiveInt", inputs: { value: 16 } },
        "8": { class_type: "PrimitiveInt", inputs: { value: 9 } },
        "21": {
          class_type: "ImagePadForOutpaint",
          inputs: { image: ["20", 0], feathering: 0 },
        },
        "30": { inputs: { image: ["24", 0], amount: 1 } },
        "47": { inputs: { image: ["21", 0], amount: 1 } },
        "37": { inputs: { text: "" } },
        "41": {
          class_type: "KSampler",
          inputs: {
            steps: 4,
            cfg: 1,
            sampler_name: "euler",
            scheduler: "simple",
            denoise: 1,
          },
        },
        "48": {
          class_type: "ImageCompositeMasked",
          inputs: {
            destination: ["47", 0],
            source: ["43", 0],
            mask: ["46", 0],
          },
        },
        "49": { class_type: "SaveImage", inputs: { images: ["48", 0] } },
      })
      expect(brokenLinks(workflow)).toEqual([])
      expect(classesOutsideCore(workflow)).toEqual([])
    }
  })

  it("sends a tall format as 9 by 16 and the default format as 16 by 9", async () => {
    const tall = await onlyWorkflow({
      inputs: { mode: "format", photo: [photoId], aspect: "9-16" },
      aspectRatio: "9:16",
    })
    expect(tall["7"]?.inputs.value).toBe(9)
    expect(tall["8"]?.inputs.value).toBe(16)
    const plain = await onlyWorkflow({
      inputs: { mode: "format", photo: [photoId] },
    })
    expect(plain["7"]?.inputs.value).toBe(16)
    expect(plain["8"]?.inputs.value).toBe(9)
  })

  it("sends the By side workflow with each side's share and the scene", async () => {
    const workflow = await onlyWorkflow({
      inputs: {
        mode: "sides",
        photo: [photoId],
        top: 10,
        right: 0,
        bottom: 25,
        left: 50,
        scene: "A harbour at dusk with boats along the quay",
      },
      aspectRatio: "2:1",
    })
    expect(workflow).toMatchObject({
      "3": { inputs: { value: 10 } },
      "4": { inputs: { value: 0 } },
      "5": { inputs: { value: 25 } },
      "6": { inputs: { value: 50 } },
      "30": { inputs: { amount: 1 } },
      "37": {
        inputs: { text: "A harbour at dusk with boats along the quay" },
      },
      "41": { inputs: { seed: 42 } },
    })
    expect(workflow["7"]).toBeUndefined()
    expect(brokenLinks(workflow)).toEqual([])
    expect(classesOutsideCore(workflow)).toEqual([])
  })

  it("loads the five open-weights files of the Qwen-Image outpainting graph", async () => {
    const workflow = await onlyWorkflow({
      inputs: { mode: "format", photo: [photoId] },
    })
    expect(workflow).toMatchObject({
      "31": { inputs: { unet_name: "qwen_image_fp8_e4m3fn.safetensors" } },
      "32": {
        inputs: { lora_name: "Qwen-Image-Lightning-4steps-V1.0.safetensors" },
      },
      "33": { inputs: { shift: 3.1 } },
      "34": {
        inputs: {
          clip_name: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
          type: "qwen_image",
        },
      },
      "35": { inputs: { vae_name: "qwen_image_vae.safetensors" } },
      "36": {
        inputs: {
          control_net_name:
            "Qwen-Image-InstantX-ControlNet-Inpainting.safetensors",
        },
      },
      "28": { inputs: { expand: 20 } },
      "50": { inputs: { blur_radius: 19 } },
      "9": { inputs: { value: 1536 } },
    })
  })

  it("names a node outside core and a link to a missing node", () => {
    const planted: Workflow = {
      "1": { class_type: "LoadImage", inputs: {} },
      "2": { class_type: "ColorMatchImage", inputs: { image: ["9", 0] } },
    }
    expect(classesOutsideCore(planted)).toEqual(["ColorMatchImage"])
    expect(brokenLinks(planted)).toEqual(["2.image -> 9"])
  })

  it.each([
    ["no photo", { inputs: { mode: "format" } }],
    [
      "a count of 5",
      { inputs: { mode: "format", photo: [photoId] }, count: 5 },
    ],
    [
      "a side of 120",
      { inputs: { mode: "sides", photo: [photoId], left: 120 } },
    ],
    [
      "a side in To a format",
      { inputs: { mode: "format", photo: [photoId], left: 50 } },
    ],
    [
      "a format in By side",
      { inputs: { mode: "sides", photo: [photoId], aspect: "16-9", left: 50 } },
    ],
    [
      "a format outside the five",
      { inputs: { mode: "format", photo: [photoId], aspect: "21-9" } },
    ],
  ])("refuses %s before any request", (_name, body) => {
    expect(() => bodyOf(body)).toThrow()
  })
})
