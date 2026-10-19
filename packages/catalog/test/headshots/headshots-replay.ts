import { type RunInputs, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { app } from "#headshots/app"
import { readApps } from "#list-apps"

export type Node = { class_type: string; inputs: Record<string, unknown> }
export type Workflow = Record<string, Node>
export type Recording = { status: number; json: unknown }
type Sent = { method: string; url: string; body: string | null }

export const cloud = "https://cloud.comfy.org"
const jobId = "5b7d9f1c-3e5a-4c7b-9d1f-3a5b7d9f1c3e"
export const uploadedId = "7d9f1c3e-5a7b-4d9f-8c3e-5a7b9d1f3c5e"
const photoId = assetIdFormat.parse("3c5e7a9b-1d3f-4b5d-9f1c-3e5a7b9d1f3c")
export const idempotencyKey = "9f1c3e5a-7b9d-4f1c-b3e5-a7b9d1f3c5e7"
export const [headshots] = readApps([{ folder: "headshots", app }])

export const recordings: Readonly<Record<string, Recording>> = {
  [`POST ${cloud}/api/v2/assets`]: {
    status: 201,
    json: {
      id: uploadedId,
      hash: "blake3:7d9f1c3e",
      size_bytes: 8,
      content_type: "image/png",
      file_path: `${photoId}.png`,
      created_new: true,
      created_at: "2026-10-17T09:00:00Z",
    },
  },
  [`POST ${cloud}/api/v2/jobs`]: {
    status: 201,
    json: {
      id: jobId,
      status: "queued",
      created_at: "2026-10-17T09:00:00Z",
      queue_position: 1,
      progress: null,
      outputs: [],
      error: null,
    },
  },
}

export function replay(recorded: Readonly<Record<string, Recording>>) {
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
    const headers = new Headers(init?.headers)
    sent.push({
      method,
      url: `${url} ${headers.get("Idempotency-Key") ?? ""}`.trim(),
      body: typeof init?.body === "string" ? init.body : null,
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { sent, fetch }
}

type Body = {
  inputs?: Record<string, unknown>
  count?: number
  aspectRatio?: string
}

function requestFor(body: Body, seed: number): EngineRequest {
  if (headshots === undefined) {
    throw new Error("The headshots app did not parse")
  }
  const parsed = startRunBodyFor(headshots).parse({
    ...body,
    inputs: { image: [photoId], ...body.inputs },
  })
  const runInputs: RunInputs = { ...parsed.inputs }
  return {
    idempotencyKey,
    binding: resolveBinding(headshots.engine, parsed.inputs),
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
    seed,
    outputKind: "image",
  }
}

export async function submitted(
  body: Body,
  seed = 4242,
  recorded = recordings
) {
  const { sent, fetch } = replay(recorded)
  const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch })
  const submission = await engine.submit(requestFor(body, seed))
  const job = sent.find((one) => one.url.includes("/api/v2/jobs"))
  const workflow: Workflow = JSON.parse(job?.body ?? "{}").workflow
  return { sent, submission, workflow }
}

export function linkOf(value: unknown): string | null {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
    ? value[0]
    : null
}

function textOf(workflow: Workflow, value: unknown): string {
  const id = linkOf(value)
  if (id === null) {
    return typeof value === "string" ? value : ""
  }
  const node = workflow[id]
  if (node?.class_type !== "StringConcatenate") {
    throw new Error(`Node ${id} is not text`)
  }
  const { string_a, string_b, delimiter } = node.inputs
  return [textOf(workflow, string_a), textOf(workflow, string_b)].join(
    typeof delimiter === "string" ? delimiter : ""
  )
}

export function seedValue(workflow: Workflow, value: unknown): number {
  const id = linkOf(value)
  const node = id === null ? undefined : workflow[id]
  if (node?.class_type === "PrimitiveInt") {
    return Number(node.inputs.value)
  }
  if (node?.class_type === "ComfyMathExpression") {
    const match = /^\(a \+ (\d+)\) % (\d+)$/.exec(
      String(node.inputs.expression)
    )
    if (match === null) {
      throw new Error(`Node ${id} adds no offset modulo a span`)
    }
    const base = seedValue(workflow, node.inputs["values.a"])
    return (base + Number(match[1])) % Number(match[2])
  }
  throw new Error(`The seed ${JSON.stringify(value)} reads no number`)
}

export function danglingLinks(workflow: Workflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.values(node.inputs)
      .map(linkOf)
      .filter((target) => target !== null && workflow[target] === undefined)
      .map((target) => `${id} -> ${target}`)
  )
}

export function reachable(workflow: Workflow, from: string): Set<string> {
  const seen = new Set<string>()
  const visit = (id: string): void => {
    if (seen.has(id) || workflow[id] === undefined) {
      return
    }
    seen.add(id)
    for (const value of Object.values(workflow[id].inputs)) {
      const target = linkOf(value)
      if (target !== null) {
        visit(target)
      }
    }
  }
  visit(from)
  return seen
}

function batchOrder(workflow: Workflow, from: unknown): string[] {
  const id = linkOf(from)
  const node = id === null ? undefined : workflow[id]
  if (id === null || node === undefined) {
    return []
  }
  if (node.class_type === "ImageBatch") {
    return [
      ...batchOrder(workflow, node.inputs.image1),
      ...batchOrder(workflow, node.inputs.image2),
    ]
  }
  return [id]
}

export function savedSamplers(workflow: Workflow): Node[] {
  return batchOrder(workflow, workflow["9"]?.inputs.images).map((id) => {
    const output = workflow[id]
    const sampler =
      output?.class_type === "VAEDecode"
        ? workflow[linkOf(output.inputs.samples) ?? ""]
        : output
    if (sampler === undefined) {
      throw new Error(`Output ${id} has no sampler`)
    }
    return sampler
  })
}

export function promptAt(workflow: Workflow, sampler: Node): string {
  const method = workflow[linkOf(sampler.inputs.positive) ?? ""]
  const encode = workflow[linkOf(method?.inputs.conditioning) ?? ""]
  return textOf(workflow, encode?.inputs.prompt)
}

export const defaults = {
  framing: "standard",
  background: "grey",
  clothes: "keep",
  keepGlasses: "on",
} as const
