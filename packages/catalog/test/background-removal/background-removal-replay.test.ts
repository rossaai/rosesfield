import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { app } from "#background-removal/app"

type Recording = {
  method: "GET" | "POST"
  url: string
  status: number
  json: unknown
}

type SentRequest = {
  method: string
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
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
      headers: new Headers(init?.headers),
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  unused(): Recording[] {
    return [...this.pending]
  }
}

const cloudUrl = "https://cloud.comfy.org"
const jobId = "6c2e4b8a-3d5f-4b7c-8e9a-1f2b3c4d5e6f"
const uploadedId = "8d3f5a7b-9c1e-4d2f-8a4b-6c7d8e9f0a1b"

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

function classesOf(workflow: Workflow): string[] {
  return Object.values(workflow)
    .map((node) => node.class_type)
    .sort()
}

const definition = appDefinition.parse(app)
const photoId = assetIdFormat.parse("3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f")
const key = "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a"

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

function requestFor(inputs: Record<string, unknown>): EngineRequest {
  const parsed = startRunBodyFor(definition).parse({ inputs })
  return {
    idempotencyKey: key,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: parsed.inputs,
    files: [photoFile],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: null,
    outputKind: "image",
  }
}

async function submitted(request: EngineRequest) {
  const replay = new ReplayFetch([uploadRecording, submitRecording])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(request)
  const job = replay.sent.find((sent) => sent.url === `${cloudUrl}/api/v2/jobs`)
  const { workflow } = sentBody.parse(JSON.parse(job?.body ?? "{}"))
  return { workflow, replay, submission }
}

const loaded = { __type: "core/ASSET", info: { id: uploadedId } }

describe("the Remove background engine request", () => {
  it("sends the transparent workflow on BiRefNet with the mask joined as alpha", async () => {
    const { workflow, replay, submission } = await submitted(
      requestFor({ image: [photoId] })
    )
    expect(submission.ref).toBe(jobId)
    expect(submission.models).toEqual(["birefnet.safetensors"])
    expect(replay.sent.map((sent) => sent.url)).toEqual([
      `${cloudUrl}/api/v2/assets`,
      `${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(key)
    expect(replay.unused()).toEqual([])
    expect(classesOf(workflow)).toEqual([
      "InvertMask",
      "JoinImageWithAlpha",
      "LoadBackgroundRemovalModel",
      "LoadImage",
      "RemoveBackground",
      "SaveImage",
    ])
    expect(workflow).toMatchObject({
      "1": { class_type: "LoadImage", inputs: { image: loaded } },
      "2": { inputs: { bg_removal_name: "birefnet.safetensors" } },
      "3": { inputs: { bg_removal_model: ["2", 0], image: ["1", 0] } },
      "4": { inputs: { mask: ["3", 0] } },
      "5": { inputs: { image: ["1", 0], alpha: ["4", 0] } },
      "9": { inputs: { images: ["5", 0] } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("places the subject over white at your image's own size", async () => {
    const { workflow } = await submitted(
      requestFor({ image: [photoId], background: "white" })
    )
    expect(workflow).toMatchObject({
      "1": { inputs: { image: loaded } },
      "6": { class_type: "GetImageSize", inputs: { image: ["1", 0] } },
      "7": {
        class_type: "EmptyImage",
        inputs: { width: ["6", 0], height: ["6", 1], color: 16_777_215 },
      },
      "8": {
        class_type: "ImageCompositeMasked",
        inputs: {
          destination: ["7", 0],
          source: ["1", 0],
          x: 0,
          y: 0,
          resize_source: false,
          mask: ["3", 0],
        },
      },
      "9": { inputs: { images: ["8", 0] } },
    })
    expect(classesOf(workflow)).not.toContain("JoinImageWithAlpha")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends black as the color 0 and the Lucida file when you pick it", async () => {
    const { workflow, submission } = await submitted(
      requestFor({ image: [photoId], background: "black", model: "lucida" })
    )
    expect(workflow["7"]?.inputs.color).toBe(0)
    expect(workflow["2"]?.inputs.bg_removal_name).toBe("lucida.safetensors")
    expect(submission.models).toEqual(["lucida.safetensors"])
    expect(brokenLinks(workflow)).toEqual([])
  })

  const requests = [
    { background: "transparent", model: "birefnet", color: null },
    { background: "transparent", model: "lucida", color: null },
    { background: "white", model: "birefnet", color: 16_777_215 },
    { background: "white", model: "lucida", color: 16_777_215 },
    { background: "black", model: "birefnet", color: 0 },
    { background: "black", model: "lucida", color: 0 },
  ]

  it.each(requests)(
    "sends one whole request for $background on $model",
    async ({ background, model, color }) => {
      const { workflow, replay, submission } = await submitted(
        requestFor({ image: [photoId], background, model })
      )
      const file = `${model}.safetensors`
      expect(replay.sent.map((sent) => sent.url)).toEqual([
        `${cloudUrl}/api/v2/assets`,
        `${cloudUrl}/api/v2/jobs`,
      ])
      expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(key)
      expect(replay.unused()).toEqual([])
      expect(workflow["1"]?.inputs.image).toEqual(loaded)
      expect(workflow["2"]?.inputs.bg_removal_name).toBe(file)
      expect(submission.models).toEqual([file])
      const classes = classesOf(workflow)
      if (color === null) {
        expect(classes).toContain("JoinImageWithAlpha")
        expect(classes).not.toContain("EmptyImage")
      } else {
        expect(classes).not.toContain("JoinImageWithAlpha")
        expect(workflow["7"]?.inputs.color).toBe(color)
      }
      expect(brokenLinks(workflow)).toEqual([])
    }
  )

  it("names a link to a node the workflow does not hold", () => {
    const planted: Workflow = {
      "5": { class_type: "JoinImageWithAlpha", inputs: { alpha: ["4", 0] } },
    }
    expect(brokenLinks(planted)).toEqual(["5.alpha -> 4"])
  })

  it("refuses a background the app does not list before any request", () => {
    expect(() => requestFor({ image: [photoId], background: "gray" })).toThrow()
  })
})
