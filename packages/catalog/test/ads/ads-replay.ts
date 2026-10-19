import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import { photoInputs } from "#ads/ads-values"
import { app } from "#ads/app"
import {
  keepRule,
  kindLeads,
  lineLeads,
  personRule,
  stylePhrases,
  wordsEnd,
  wordsLeads,
} from "#ads/comfy/ads-prompts"

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

const cloudUrl = "https://cloud.comfy.org"
export const jobId = "3a7c9e1b-5d2f-4b6a-8c0e-1f2a3b4c5d6e"

export const productOne = assetIdFormat.parse(
  "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
)
export const productTwo = assetIdFormat.parse(
  "5e3d2c1b-0a9f-4b7c-9d6e-4f3a2b1c0d9e"
)
export const productThree = assetIdFormat.parse(
  "9c7b6a5f-4e3d-4c2b-8a1f-0e9d8c7b6a5f"
)
export const characterPhoto = assetIdFormat.parse(
  "6f4e3d2c-1b0a-4c8d-8e7f-5a4b3c2d1e0f"
)
export const characterId = "7a5f4e3d-2c1b-4d9e-9f8a-6b5c4d3e2f1a"

const comfyIds: Readonly<Record<string, string>> = {
  [productOne]: "8e1f2a3b-4c5d-4e6f-9a0b-1c2d3e4f5a61",
  [productTwo]: "8e1f2a3b-4c5d-4e6f-9a0b-1c2d3e4f5a62",
  [productThree]: "8e1f2a3b-4c5d-4e6f-9a0b-1c2d3e4f5a64",
  [characterPhoto]: "8e1f2a3b-4c5d-4e6f-9a0b-1c2d3e4f5a63",
}

function uploadAnswer(comfyId: string): unknown {
  return {
    id: comfyId,
    hash: `blake3:${comfyId.slice(0, 8)}`,
    size_bytes: 12,
    content_type: "image/png",
    file_path: "photo.png",
    created_new: true,
    created_at: "2026-10-17T09:00:00Z",
    url: `${cloudUrl}/api/v2/assets/${comfyId}/content`,
    url_expires_at: "2026-10-17T10:00:00Z",
  }
}

export const submitRecording: Recording = {
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

function uploadedName(body: unknown): string | null {
  if (!(body instanceof FormData)) {
    return null
  }
  let name: string | null = null
  body.forEach((value) => {
    if (value instanceof File) {
      name = value.name
    }
  })
  return name
}

export class ReplayFetch {
  readonly sent: SentRequest[] = []
  readonly uploads: string[] = []
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
    const json = this.answer(method, url, init?.body)
    this.sent.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
      headers: new Headers(init?.headers),
    })
    return new Response(JSON.stringify(json.body), {
      status: json.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  private answer(
    method: string,
    url: string,
    body: unknown
  ): { status: number; body: unknown } {
    if (method === "POST" && url === `${cloudUrl}/api/v2/assets`) {
      const name = uploadedName(body) ?? ""
      const assetId = name.replace(/\.[a-z0-9]+$/, "")
      const comfyId = comfyIds[assetId]
      if (comfyId === undefined) {
        throw new Error(`No recording for the upload of ${name}`)
      }
      this.uploads.push(assetId)
      return { status: 201, body: uploadAnswer(comfyId) }
    }
    const index = this.pending.findIndex(
      (recording) => recording.method === method && recording.url === url
    )
    const recording = this.pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    return { status: recording.status, body: recording.json }
  }
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

function regexReplace(node: Node, read: (name: string) => string): string {
  const flags = [
    "g",
    node.inputs.case_insensitive === true ? "i" : "",
    node.inputs.multiline === true ? "m" : "",
    node.inputs.dotall === true ? "s" : "",
  ].join("")
  return read("string").replace(
    new RegExp(read("regex_pattern"), flags),
    read("replace")
  )
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
    case "RegexReplace":
      return regexReplace(node, read)
    default:
      throw new Error(`Cannot read text from ${node.class_type}`)
  }
}

export function promptOf(
  workflow: Workflow,
  nodeId: string,
  input: string
): string {
  return textAt(workflow, workflow[nodeId]?.inputs[input])
}

const definition = appDefinition.parse(app)
export const key = "6b5a4c3d-2e1f-4a0b-9c8d-7e6f5a4b3c2d"
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
export const placeholderImage = "product-photo.png"

const sentBody = z.object({
  workflow: z.record(
    z.string(),
    z.object({
      class_type: z.string(),
      inputs: z.record(z.string(), z.unknown()),
    })
  ),
})

function fileOf(assetId: AssetId): EngineRequest["files"][number] {
  return { assetId, kind: "image", mime: "image/png", bytes: photo }
}

function photosOf(inputs: Record<string, unknown>): AssetId[] {
  return photoInputs.flatMap((name) =>
    z
      .array(z.string())
      .default([])
      .parse(inputs[name])
      .map((id) => assetIdFormat.parse(id))
  )
}

export function requestFor(
  inputs: Record<string, unknown>,
  aspectRatio: string
): EngineRequest {
  const parsed = startRunBodyFor(definition).parse({ inputs, aspectRatio })
  const hasCharacter =
    z.array(z.string()).default([]).parse(parsed.inputs.character).length > 0
  const characterRefs = hasCharacter ? [characterPhoto] : []
  return {
    idempotencyKey: key,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs: { ...parsed.inputs, character: characterRefs },
    files: [...photosOf(parsed.inputs), ...characterRefs].map(fileOf),
    count: 1,
    aspectRatio: parsed.aspectRatio,
    seed: 42,
    outputKind: "image",
  }
}

export function engineWith(replay: ReplayFetch): ComfyGenerationEngine {
  return new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
}

export async function submitted(
  request: EngineRequest
): Promise<{ workflow: Workflow; replay: ReplayFetch; ref: string }> {
  const replay = new ReplayFetch([submitRecording])
  const submission = await engineWith(replay).submit(request)
  const job = replay.sent.find((sent) => sent.url === `${cloudUrl}/api/v2/jobs`)
  const { workflow } = sentBody.parse(JSON.parse(job?.body ?? "{}"))
  return { workflow, replay, ref: submission.ref }
}

export function loaded(assetId: AssetId): unknown {
  return { __type: "core/ASSET", info: { id: comfyIds[assetId] } }
}

export function loadNodes(workflow: Workflow): string[] {
  return Object.entries(workflow)
    .filter(([, node]) => node.class_type === "LoadImage")
    .map(([id]) => id)
    .sort()
}

export function unfilledLoads(workflow: Workflow): string[] {
  return loadNodes(workflow).filter(
    (id) => workflow[id]?.inputs.image === placeholderImage
  )
}

export function adPrompt(options: {
  style: keyof typeof stylePhrases
  headline: string
  line: string | null
  hasPerson: boolean
}): string {
  const line = options.line === null ? "" : `${lineLeads.ad}${options.line}`
  const keep = options.hasPerson ? `${keepRule}${personRule}` : keepRule
  return `${kindLeads.ad}${stylePhrases[options.style]}${wordsLeads.ad}${options.headline}${line}${wordsEnd}${keep}`
}
