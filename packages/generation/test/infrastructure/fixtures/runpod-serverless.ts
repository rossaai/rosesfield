import { pngBytes } from "../../sample"
import type { Recording } from "../replay-fetch"

export const endpointId = "q8wz2v7k1m3x9a"
export const endpointUrl = `https://api.runpod.ai/v2/${endpointId}`
export const runPodJobId = "eaebd6e7-6a92-4bb8-a911-f996ac5ea99d"
export const workerId = "eofgkpcx2a8gq3"
export const outputUrl =
  "https://bucket.example-storage.com/outputs/ComfyUI_00001_.mp4?X-Amz-Signature=3f2a"

const statusUrl = `${endpointUrl}/status/${runPodJobId}`

function base64Of(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function job(status: string, extra: Record<string, unknown> = {}) {
  return {
    delayTime: status === "IN_QUEUE" ? undefined : 2624,
    id: runPodJobId,
    status,
    ...(status === "IN_QUEUE" ? {} : { workerId }),
    ...extra,
  }
}

export const completedOutput = {
  images: [
    {
      filename: "ComfyUI_00001_.png",
      type: "base64",
      data: base64Of(pngBytes()),
    },
  ],
}

export const runPod = {
  run: (): Recording => ({
    method: "POST",
    url: `${endpointUrl}/run`,
    status: 200,
    json: { id: runPodJobId, status: "IN_QUEUE" },
  }),
  status: (status: string, extra: Record<string, unknown> = {}): Recording => ({
    method: "GET",
    url: statusUrl,
    status: 200,
    json: job(status, extra),
  }),
  completed: (output: unknown = completedOutput): Recording => ({
    method: "GET",
    url: statusUrl,
    status: 200,
    json: job("COMPLETED", { executionTime: 1437, output }),
  }),
  cancel: (): Recording => ({
    method: "POST",
    url: `${endpointUrl}/cancel/${runPodJobId}`,
    status: 200,
    json: { id: runPodJobId, status: "CANCELLED" },
  }),
  health: (status = 200): Recording => ({
    method: "GET",
    url: `${endpointUrl}/health`,
    status,
    json:
      status === 200
        ? {
            jobs: {
              completed: 1,
              failed: 0,
              inProgress: 0,
              inQueue: 0,
              retried: 0,
            },
            workers: { idle: 0, running: 0 },
          }
        : { error: "Unauthorized" },
  }),
  refusal: (url: string, status: number): Recording => ({
    method: "POST",
    url,
    status,
    json: { error: `Refused with ${status}` },
  }),
  download: (): Recording => ({
    method: "GET",
    url: outputUrl,
    status: 200,
    headers: { "Content-Type": "binary/octet-stream" },
    bytes: Uint8Array.of(0, 0, 0, 24, 102, 116, 121, 112),
  }),
}
