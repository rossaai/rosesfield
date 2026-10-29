import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  type EngineFile,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import { readApps } from "#list-apps"
import { findWorkflow } from "#list-workflows"
import { app } from "#motion/app"

export type Recording = {
  method: "GET" | "POST"
  url: string
  status: number
  json?: unknown
  bytes?: Uint8Array
  contentType?: string
}

export type Sent = {
  method: string
  url: string
  headers: Headers
  body: unknown
  form: FormData
}

export class ReplayFetch {
  readonly sent: Sent[] = []
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
    if (index === -1 || recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    this.sent.push({
      method,
      url,
      headers: new Request(url, init).headers,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      form: init?.body instanceof FormData ? init.body : new FormData(),
    })
    if (recording.bytes !== undefined) {
      return new Response(new Uint8Array(recording.bytes), {
        status: recording.status,
        headers: {
          "Content-Type": recording.contentType ?? "application/octet-stream",
        },
      })
    }
    return new Response(JSON.stringify(recording.json ?? null), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  unused(): Recording[] {
    return [...this.pending]
  }
}

export type Node = { class_type: string; inputs: Record<string, unknown> }

export type Graph = Record<string, Node>

export const graphSchema: z.ZodType<Graph> = z.record(
  z.string(),
  z.object({
    class_type: z.string(),
    inputs: z.record(z.string(), z.unknown()),
  })
)

function parseMotion(): AppDefinition {
  const [parsed] = readApps([{ folder: "motion", app }])
  if (parsed === undefined) {
    throw new Error("The motion app did not parse")
  }
  return parsed
}

export const motion = parseMotion()

export const motionWorkflowId = "motion-ltx-2-3-ic-lora"

export function fileGraph(): Graph {
  const workflow = findWorkflow(motionWorkflowId)
  if (workflow === null) {
    throw new Error(`workflows/${motionWorkflowId} is not listed`)
  }
  return graphSchema.parse(structuredClone(workflow.graph))
}

export const photoId = assetIdFormat.parse(
  "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
)
export const clipId = assetIdFormat.parse(
  "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"
)

export const both = {
  example: "own",
  model: "ltx-2-3-control",
  photo: [photoId],
  clip: [clipId],
}

export function filesWith(clipBytes: Uint8Array): EngineFile[] {
  return [
    {
      assetId: photoId,
      kind: "image",
      mime: "image/jpeg",
      bytes: Uint8Array.of(255, 216, 255),
    },
    {
      assetId: clipId,
      kind: "video",
      mime: "video/mp4",
      bytes: clipBytes,
    },
  ]
}

export function requestFor(
  inputs: Record<string, unknown>,
  files: readonly EngineFile[] = filesWith(Uint8Array.of(0, 0, 0, 24)),
  seed = 914
): EngineRequest {
  const parsed = startRunBodyFor(motion).parse({ inputs })
  return {
    idempotencyKey: "motion-run-1",
    binding: resolveBinding(motion.engine, parsed.inputs),
    inputs: parsed.inputs,
    files,
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed,
    outputKind: "video",
    timeoutSeconds: motion.limits.timeoutSeconds,
  }
}

export function linksToMissingNodes(graph: Graph): string[] {
  const ids = new Set(Object.keys(graph))
  return Object.entries(graph).flatMap(([id, node]) =>
    Object.entries(node.inputs)
      .filter(
        ([, value]) =>
          Array.isArray(value) &&
          typeof value[0] === "string" &&
          !ids.has(value[0])
      )
      .map(([name]) => `${id}.${name}`)
  )
}
