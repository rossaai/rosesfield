import {
  type EngineBinding,
  type RunInputs,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { app } from "#headshots/app"
import { editWorkflowId } from "#headshots/comfy/headshots-binding"
import { readApps } from "#list-apps"
import { findWorkflow, type Workflow } from "#list-workflows"

export type Node = { class_type: string; inputs: Record<string, unknown> }
export type Graph = Record<string, Node>
type Recording = { status: number; json: unknown }

export const cloud = "https://cloud.comfy.org"
export const uploadedId = "7d9f1c3e-5a7b-4d9f-8c3e-5a7b9d1f3c5e"
const jobId = "5b7d9f1c-3e5a-4c7b-9d1f-3a5b7d9f1c3e"
const photoId = assetIdFormat.parse("3c5e7a9b-1d3f-4b5d-9f1c-3e5a7b9d1f3c")
const idempotencyKey = "9f1c3e5a-7b9d-4f1c-b3e5-a7b9d1f3c5e7"
export const [headshots] = readApps([{ folder: "headshots", app }])

const recordings: Readonly<Record<string, Recording>> = {
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

function realEdit(): Workflow {
  const edit = findWorkflow(editWorkflowId)
  if (edit === null) {
    throw new Error(`No folder holds ${editWorkflowId}`)
  }
  return edit
}

export const editModels = realEdit().models

type EditShape = { drop?: string; extra?: Graph }

export function editWorkflow(shape: EditShape = {}): Workflow {
  const edit = realEdit()
  return {
    ...edit,
    inputs: Object.fromEntries(
      Object.entries(edit.inputs).filter(([name]) => name !== shape.drop)
    ),
    graph: { ...structuredClone(edit.graph), ...shape.extra },
  }
}

function replayFetch() {
  const sent: { url: string; body: string | null }[] = []
  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const recording = recordings[`${method} ${url}`]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    sent.push({ url, body: typeof init?.body === "string" ? init.body : null })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { sent, fetch }
}

type Body = {
  inputs?: Record<string, unknown>
  aspectRatio?: string
}

export async function submitted(
  binding: EngineBinding,
  body: Body,
  seed = 4242
): Promise<{ graph: Graph; models: readonly string[] }> {
  if (headshots === undefined) {
    throw new Error("The headshots app did not parse")
  }
  const parsed = startRunBodyFor(headshots).parse({
    ...body,
    inputs: { image: [photoId], ...body.inputs },
  })
  const inputs: RunInputs = { ...parsed.inputs }
  const request: EngineRequest = {
    idempotencyKey,
    binding,
    inputs,
    files: [
      {
        assetId: photoId,
        kind: "image",
        mime: "image/png",
        bytes: new Uint8Array(8),
      },
    ],
    count: 1,
    aspectRatio: parsed.aspectRatio,
    seed,
    outputKind: "image",
  }
  const { sent, fetch } = replayFetch()
  const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch })
  const submission = await engine.submit(request)
  const job = sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  const graph: Graph = JSON.parse(job?.body ?? "{}").workflow
  return { graph, models: submission.models }
}

function linkOf(value: unknown): string | null {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
    ? value[0]
    : null
}

export function textOf(graph: Graph, value: unknown): string {
  const id = linkOf(value)
  if (id === null) {
    return typeof value === "string" ? value : ""
  }
  const node = graph[id]
  if (node?.class_type !== "StringConcatenate") {
    throw new Error(`Node ${id} is not text`)
  }
  const { string_a, string_b, delimiter } = node.inputs
  return [textOf(graph, string_a), textOf(graph, string_b)].join(
    typeof delimiter === "string" ? delimiter : ""
  )
}

export const defaults = {
  framing: "standard",
  background: "grey",
  clothes: "keep",
  keepGlasses: "on",
} as const
