import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import { app } from "#relight/app"

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
}

export const cloudUrl = "https://cloud.comfy.org"
export const jobId = "6c2e4f8a-3d5f-4b7c-8e9a-1f2b3c4d5e6f"
const uploadedId = "8d3f5a7b-9e1c-4d2b-9f4a-6a8b0c2d4e6f"

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

export type Workflow = Record<string, Node>

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

export function brokenLinks(workflow: Workflow): string[] {
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

function textOf(workflow: Workflow, value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (!isLink(value)) {
    throw new Error("a text input holds neither a string nor a link")
  }
  const node = workflow[value[0]]
  if (node === undefined) {
    throw new Error(`no node ${value[0]}`)
  }
  const { inputs } = node
  switch (node.class_type) {
    case "StringConcatenate":
      return [
        textOf(workflow, inputs.string_a),
        textOf(workflow, inputs.string_b),
      ].join(textOf(workflow, inputs.delimiter))
    case "RegexReplace":
      return textOf(workflow, inputs.string).replace(
        new RegExp(textOf(workflow, inputs.regex_pattern)),
        textOf(workflow, inputs.replace)
      )
    default:
      throw new Error(`no text from ${node.class_type}`)
  }
}

export function promptSent(workflow: Workflow): string {
  return textOf(workflow, workflow["10"]?.inputs.prompt)
}

export const triggerWord = "重新照明,"

export const draft2509Models = [
  "qwen_image_edit_2509_fp8_e4m3fn.safetensors",
  "Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors",
  "Qwen-Image-Edit-2509-Relight.safetensors",
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  "qwen_image_vae.safetensors",
]

export const definition = appDefinition.parse(app)
export const photoId = assetIdFormat.parse(
  "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f"
)
export const key = "8d7c6b5a-4e3f-4b2a-9c8d-1e2f3a4b5c6d"

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

export function requestFor(
  inputs: Record<string, unknown>,
  count?: number,
  seed = 42
): EngineRequest {
  const parsed = startRunBodyFor(definition).parse({
    inputs,
    ...(count === undefined ? {} : { count }),
  })
  return {
    idempotencyKey: key,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: parsed.inputs,
    files: [photoFile],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed,
    outputKind: "image",
  }
}

export async function submitted(request: EngineRequest) {
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

export const loaded = { __type: "core/ASSET", info: { id: uploadedId } }
