import { findWorkflow } from "#list-workflows"

export type Recording = {
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
export const jobId = "5b1d3f7a-2c4e-4a6b-9d8f-0e1a2b3c4d5e"
export const uploadedId = "9c2e4a6b-8d0f-4b1a-8c3e-5f7a9b1c3d5e"

export function uploadRecording(
  contentType: string,
  filePath: string
): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: {
      id: uploadedId,
      hash: "blake3:9c2e4a6b",
      size_bytes: 12,
      content_type: contentType,
      file_path: filePath,
      created_new: true,
      created_at: "2026-10-17T09:00:00Z",
      url: `${cloudUrl}/api/v2/assets/${uploadedId}/content`,
      url_expires_at: "2026-10-17T10:00:00Z",
    },
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

export function classesOf(workflow: Workflow): string[] {
  return Object.values(workflow)
    .map((node) => node.class_type)
    .sort()
}

export function workflowClassesOf(id: string): string[] {
  const found = findWorkflow(id)
  if (found === null) {
    throw new Error(`workflows/ holds no ${id}`)
  }
  return Object.values(found.graph)
    .map((node) =>
      typeof node === "object" && node !== null && "class_type" in node
        ? String(node.class_type)
        : ""
    )
    .sort()
}
