import {
  ComfyGenerationEngine,
  CreditMeter,
  type Fetch,
} from "@rosesfield/generation"
import { z } from "zod"
import type { PortsFor } from "../harness"
import { localPorts } from "../local-ports"

export const jobId = "3a7c9e1b-5d2f-4b6a-8c0e-1f2a3b4c5d6e"
const outputId = "2b3e4f56-8a7b-4c2d-9e4f-5a6b9f8a1c0d"
export const uploadedId = "8e1f2a3b-4c5d-4e6f-9a0b-1c2d3e4f5a6b"
const mp4 = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)

export function pngOf(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  view.setUint32(16, width)
  view.setUint32(20, height)
  bytes.set([8, 6], 24)
  return bytes
}

const sentJob = z.object({
  workflow: z.record(
    z.string(),
    z.object({ inputs: z.record(z.string(), z.unknown()) })
  ),
})

type SentGraph = z.infer<typeof sentJob>["workflow"]

type JobState = "succeeded" | "running"

function outputsOf(status: string): Record<string, unknown>[] {
  if (status !== "succeeded") {
    return []
  }
  return [
    {
      id: outputId,
      node_id: "75",
      name: "rosesfield-effects_00001_.mp4",
      type: "video",
      content_type: "video/mp4",
    },
  ]
}

function jobBody(status: string): Record<string, unknown> {
  return {
    id: jobId,
    status,
    created_at: "2026-10-17T09:00:00Z",
    started_at: "2026-10-17T09:00:09Z",
    completed_at: status === "succeeded" ? "2026-10-17T09:02:00Z" : null,
    expires_at: "2026-10-18T09:00:00Z",
    queue_position: null,
    progress: null,
    metrics: { queue_ms: 9000, execution_ms: 111_000 },
    outputs: outputsOf(status),
    error: null,
  }
}

function uploadBody(): Record<string, unknown> {
  return {
    id: uploadedId,
    hash: "blake3:8e1f2a3b",
    size_bytes: 33,
    content_type: "image/png",
    file_path: "photo.png",
    created_new: true,
    created_at: "2026-10-17T09:00:00Z",
    url: `https://cloud.comfy.org/api/v2/assets/${uploadedId}/content`,
    url_expires_at: "2026-10-17T10:00:00Z",
  }
}

export type ReplayedComfy = {
  fetch: Fetch
  graphs: SentGraph[]
  sent: string[]
}

export function replayedComfy(state: JobState): ReplayedComfy {
  const graphs: SentGraph[] = []
  const sent: string[] = []
  const cents = [1000, 999.5, 999.5]
  const fetch: Fetch = async (input, init) => {
    const request = new Request(String(input), init)
    const { host, pathname } = new URL(request.url)
    sent.push(`${request.method} ${pathname}`)
    if (host === "api.comfy.org" && pathname === "/customers/balance") {
      return Response.json({ amount_cents: cents.shift() ?? 999.5 })
    }
    if (request.method === "POST" && pathname === "/api/v2/assets") {
      return Response.json(uploadBody(), { status: 201 })
    }
    if (request.method === "POST" && pathname === "/api/v2/jobs") {
      graphs.push(sentJob.parse(await request.json()).workflow)
      return Response.json(jobBody("queued"), { status: 201 })
    }
    if (pathname === `/api/v2/jobs/${jobId}`) {
      return Response.json(jobBody(state))
    }
    if (pathname === `/api/v2/jobs/${jobId}/cancel`) {
      return Response.json(jobBody("canceling"))
    }
    if (pathname === `/api/v2/assets/${outputId}/content`) {
      return new Response(mp4, { headers: { "content-type": "video/mp4" } })
    }
    throw new Error(`No recording for ${request.method} ${request.url}`)
  }
  return { fetch, graphs, sent }
}

export function livePorts(comfy: ReplayedComfy): PortsFor {
  return (clock, folder) => ({
    ...localPorts(clock, folder),
    engines: [
      new ComfyGenerationEngine({
        apiKey: "comfyui-test",
        fetch: comfy.fetch,
        meter: new CreditMeter({ clock, wait: async () => undefined }),
      }),
    ],
  })
}
