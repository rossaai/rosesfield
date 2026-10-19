import { startRunBodyFor } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { videoApp } from "./video-gateway"

export const cloudUrl = "https://cloud.comfy.org"
export const jobId = "4c2b1a09-8f7e-4d6c-9b5a-3e2d1c0b9a8f"
export const uploadedId = "8e7d6c5b-4a39-4281-b0c9-d8e7f6a5b4c3"
export const startFrameId = assetIdFormat.parse(
  "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
)

export type Recording = {
  method: string
  url: string
  status: number
  json: unknown
}
export type Sent = {
  method: string
  url: string
  body: string | null
  idempotencyKey: string | null
}

export function replayFetch(recordings: Recording[]) {
  const pending = [...recordings]
  const sent: Sent[] = []
  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const index = pending.findIndex(
      (one) => one.method === method && one.url === url
    )
    const recording = pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    pending.splice(index, 1)
    sent.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
      idempotencyKey: new Headers(init?.headers).get("Idempotency-Key"),
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { fetch, sent }
}

export const queuedJob = {
  id: jobId,
  status: "queued",
  created_at: "2026-10-17T09:00:00Z",
  outputs: [],
  error: null,
}

export const recorded = {
  upload: {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: {
      id: uploadedId,
      hash: "blake3:8e7d6c5b",
      size_bytes: 12,
      content_type: "image/png",
      created_new: true,
    },
  },
  submit: {
    method: "POST",
    url: `${cloudUrl}/api/v2/jobs`,
    status: 201,
    json: queuedJob,
  },
}

export type Workflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>

export const asset = { __type: "core/ASSET", info: { id: uploadedId } }
export const prompt = "a fox walks through deep snow"
export function checked(inputs: Record<string, unknown>, count = 1) {
  return startRunBodyFor(videoApp()).safeParse({ inputs, count })
}

export const clipId = assetIdFormat.parse(
  "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"
)
