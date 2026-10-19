import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import { effectsApp } from "#effects/app"
import { effectRecipes } from "#effects/effect-recipes"

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

export class ReplayFetch {
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
export const jobId = "3a7c9e1b-5d2f-4b6a-8c0e-1f2a3b4c5d6e"
const uploadedId = "8e1f2a3b-4c5d-4e6f-9a0b-1c2d3e4f5a6b"

const uploadRecording: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/assets`,
  status: 201,
  json: {
    id: uploadedId,
    hash: "blake3:8e1f2a3b",
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

export type Node = { class_type: string; inputs: Record<string, unknown> }

export type Workflow = Record<string, Node>

export function isLink(value: unknown): value is [string, number] {
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

function textAt(workflow: Workflow, value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (!isLink(value)) {
    throw new Error(`Not text: ${JSON.stringify(value)}`)
  }
  const node = workflow[value[0]]
  if (node === undefined) {
    throw new Error(`No node ${value[0]}`)
  }
  const read = (name: string): string => textAt(workflow, node.inputs[name])
  switch (node.class_type) {
    case "StringConcatenate":
      return [read("string_a"), read("string_b")].join(read("delimiter"))
    case "StringReplace":
      return read("string").replaceAll(read("find"), read("replace"))
    case "StringTrim":
      return read("string").trim()
    default:
      throw new Error(`Cannot read text from ${node.class_type}`)
  }
}

export function promptText(workflow: Workflow, encoderId: string): string {
  return textAt(workflow, workflow[encoderId]?.inputs.text)
}

export const definition = appDefinition.parse(effectsApp(effectRecipes))
export const photoId = assetIdFormat.parse(
  "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
)
export const idempotencyKey = "6b5a4c3d-2e1f-4a0b-9c8d-7e6f5a4b3c2d"
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)

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
  aspectRatio: string
): EngineRequest {
  const parsed = startRunBodyFor(definition).parse({ inputs, aspectRatio })
  return {
    idempotencyKey,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: parsed.inputs,
    files: [
      { assetId: photoId, kind: "image", mime: "image/png", bytes: photo },
    ],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 42,
    outputKind: "video",
  }
}

export async function submitted(
  request: EngineRequest
): Promise<{ workflow: Workflow; replay: ReplayFetch; ref: string }> {
  const replay = new ReplayFetch([uploadRecording, submitRecording])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(request)
  const job = replay.sent.find((sent) => sent.url === `${cloudUrl}/api/v2/jobs`)
  const { workflow } = sentBody.parse(JSON.parse(job?.body ?? "{}"))
  return { workflow, replay, ref: submission.ref }
}

export const loadedPhoto = { __type: "core/ASSET", info: { id: uploadedId } }
