import type { Recording } from "../../../generation/test/infrastructure/replay-fetch"

export const cloudUrl = "https://cloud.comfy.org"
export const jobId = "7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b"
export const outputId = "2b3e4f56-8a7b-4c2d-9e4f-5a6b9f8a1c0d"
export const uploadedId = "9f8a1c0d-2b3e-4f56-8a7b-1c2d3e4f5a6b"
export const endpointId = "q8wz2v7k1m3x9a"
export const runPodJobId = "eaebd6e7-6a92-4bb8-a911-f996ac5ea99d"
export const pngBytes = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0)

const jobUrl = `${cloudUrl}/api/v2/jobs/${jobId}`
const endpointUrl = `https://api.runpod.ai/v2/${endpointId}`

function job(status: string, extra: Record<string, unknown> = {}): unknown {
  return {
    id: jobId,
    status,
    created_at: "2026-10-17T09:00:00Z",
    started_at: status === "queued" ? null : "2026-10-17T09:00:09Z",
    completed_at: null,
    expires_at: "2026-11-16T09:00:00Z",
    queue_position: status === "queued" ? 1 : null,
    progress: null,
    outputs: [],
    error: null,
    urls: {
      self: `/api/v2/jobs/${jobId}`,
      events: `/api/v2/jobs/${jobId}/events`,
      cancel: `/api/v2/jobs/${jobId}/cancel`,
    },
    ...extra,
  }
}

function read(body: unknown): Recording {
  return { method: "GET", url: jobUrl, status: 200, json: body }
}

export function succeeded(
  metrics: Record<string, number | null> = {
    queue_ms: 9000,
    execution_ms: 42000,
  }
): unknown {
  return job("succeeded", {
    completed_at: "2026-10-17T09:00:51Z",
    metrics,
    outputs: [
      {
        node_id: "9",
        name: "rosesfield-image_00001_.png",
        type: "image",
        content_type: "image/png",
        size_bytes: 10,
        id: outputId,
        hash: null,
        url: `https://storage.comfy.org/signed/${outputId}`,
        url_expires_at: "2026-10-17T10:00:00Z",
        job_id: jobId,
      },
    ],
  })
}

export const comfy = {
  submit: (): Recording => ({
    method: "POST",
    url: `${cloudUrl}/api/v2/jobs`,
    status: 201,
    json: job("queued"),
  }),
  running: (): Recording => read(job("running", { progress: { value: 0.5 } })),
  succeeded: (metrics?: Record<string, number | null>): Recording =>
    read(succeeded(metrics)),
  failed: (): Recording =>
    read(
      job("failed", {
        error: { code: "node_execution_error", message: "KSampler raised" },
      })
    ),
  content: (): Recording => ({
    method: "GET",
    url: `${cloudUrl}/api/v2/assets/${outputId}/content`,
    status: 200,
    headers: { "Content-Type": "image/png" },
    bytes: pngBytes,
  }),
  cancel: (): Recording => ({
    method: "POST",
    url: `${jobUrl}/cancel`,
    status: 200,
    json: job("canceling"),
  }),
  upload: (): Recording => ({
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: {
      id: uploadedId,
      hash: "blake3:9f8a1c0d",
      size_bytes: 10,
      content_type: "image/png",
      file_path: "image.png",
      created_new: true,
      created_at: "2026-10-17T09:00:00Z",
      url: `${cloudUrl}/api/v2/assets/${uploadedId}/content`,
      url_expires_at: "2026-10-17T10:00:00Z",
    },
  }),
}

function runPodJob(status: string, extra: Record<string, unknown> = {}) {
  return { id: runPodJobId, status, delayTime: 2624, ...extra }
}

const statusUrl = `${endpointUrl}/status/${runPodJobId}`

export const runPod = {
  run: (): Recording => ({
    method: "POST",
    url: `${endpointUrl}/run`,
    status: 200,
    json: { id: runPodJobId, status: "IN_QUEUE" },
  }),
  running: (): Recording => ({
    method: "GET",
    url: statusUrl,
    status: 200,
    json: runPodJob("IN_PROGRESS"),
  }),
  completed: (): Recording => ({
    method: "GET",
    url: statusUrl,
    status: 200,
    json: runPodJob("COMPLETED", {
      executionTime: 1437,
      output: {
        images: [
          {
            filename: "rosesfield-image_00001_.png",
            type: "base64",
            data: btoa(String.fromCharCode(...pngBytes)),
          },
        ],
      },
    }),
  }),
}
