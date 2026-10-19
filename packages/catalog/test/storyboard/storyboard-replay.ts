export type Recording = {
  method: "GET" | "POST"
  url: string
  status: number
  json: unknown
}

export const cloudUrl = "https://cloud.comfy.org"
export const jobId = "5d3f7b9c-2e4a-4b6c-8d0e-3f5a7b9c1d2e"
export const uploadedId = "8b0d2f4a-6c8e-4a1b-9d3f-5e7a9c1b3d5f"

export const submitJob: Recording = {
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

export const uploadAnchor: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/assets`,
  status: 201,
  json: {
    id: uploadedId,
    hash: "blake3:8b0d2f4a",
    size_bytes: 8,
    content_type: "image/png",
    file_path: "anchor.png",
    created_new: true,
    created_at: "2026-10-17T09:00:00Z",
    url: `${cloudUrl}/api/v2/assets/${uploadedId}/content`,
    url_expires_at: "2026-10-17T10:00:00Z",
  },
}

export class ReplayFetch {
  readonly bodies = new Map<string, unknown>()
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
      (one) => one.method === method && one.url === url
    )
    const recording = this.pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    if (typeof init?.body === "string") {
      this.bodies.set(url, JSON.parse(init.body))
    }
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  unused(): Recording[] {
    return [...this.pending]
  }
}

export type ApiWorkflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>

function isLink(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function workflowSent(replay: ReplayFetch): ApiWorkflow {
  const body = replay.bodies.get(`${cloudUrl}/api/v2/jobs`)
  const workflow = isRecord(body) ? body.workflow : null
  if (!isRecord(workflow)) {
    throw new Error("No workflow was sent")
  }
  const nodes: ApiWorkflow = {}
  for (const [id, value] of Object.entries(workflow)) {
    if (!isRecord(value) || !isRecord(value.inputs)) {
      throw new Error(`Node ${id} has no inputs`)
    }
    nodes[id] = { class_type: String(value.class_type), inputs: value.inputs }
  }
  return nodes
}

export function danglingLinks(workflow: ApiWorkflow): string[] {
  return Object.entries(workflow).flatMap(([id, one]) =>
    Object.entries(one.inputs).flatMap(([name, value]) =>
      isLink(value) && !Object.hasOwn(workflow, value[0])
        ? [`${id}.${name} -> ${value[0]}`]
        : []
    )
  )
}

export function reachableFrom(workflow: ApiWorkflow, id: string): Set<string> {
  const seen = new Set<string>()
  const visit = (current: string): void => {
    if (seen.has(current)) {
      return
    }
    seen.add(current)
    for (const value of Object.values(workflow[current]?.inputs ?? {})) {
      if (isLink(value)) {
        visit(value[0])
      }
    }
  }
  visit(id)
  return seen
}

export function textAt(workflow: ApiWorkflow, value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (!isLink(value)) {
    throw new Error(`No text at ${JSON.stringify(value)}`)
  }
  const one = workflow[value[0]]
  if (one?.class_type !== "StringConcatenate") {
    throw new Error(`Node ${value[0]} makes no text`)
  }
  const delimiter = String(one.inputs.delimiter ?? "")
  return [
    textAt(workflow, one.inputs.string_a),
    textAt(workflow, one.inputs.string_b),
  ].join(delimiter)
}

export function batchOrder(workflow: ApiWorkflow, value: unknown): string[] {
  if (!isLink(value)) {
    throw new Error(`No image at ${JSON.stringify(value)}`)
  }
  const one = workflow[value[0]]
  if (one?.class_type === "ImageBatch") {
    return [
      ...batchOrder(workflow, one.inputs.image1),
      ...batchOrder(workflow, one.inputs.image2),
    ]
  }
  return [value[0]]
}
