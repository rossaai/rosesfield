import { comfyWorkflow } from "#infrastructure/comfy/comfy-workflow-binding"
import { pngBytes } from "../../sample"
import type { Recording } from "../replay-fetch"

export const cloudUrl = "https://cloud.comfy.org"
export const proxyUrl = "http://127.0.0.1:8189"
export const jobId = "7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b"
export const uploadedId = "9f8a1c0d-2b3e-4f56-8a7b-1c2d3e4f5a6b"
export const outputId = "2b3e4f56-8a7b-4c2d-9e4f-5a6b9f8a1c0d"
export const unknownJobId = "00000000-0000-0000-0000-000000000000"

export const workflowBinding = comfyWorkflow({
  workflow: {
    "3": {
      class_type: "KSampler",
      inputs: { seed: 0, steps: 4, model: ["4", 0], positive: ["6", 0] },
    },
    "6": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["4", 1] } },
    "10": { class_type: "LoadImage", inputs: { image: "" } },
    "9": { class_type: "SaveImage", inputs: { images: ["8", 0] } },
  },
  bindings: [
    { from: "input", name: "prompt", path: ["6", "inputs", "text"] },
    { from: "seed", path: ["3", "inputs", "seed"] },
    {
      from: "input",
      name: "references",
      index: 0,
      path: ["10", "inputs", "image"],
    },
  ],
  models: ["sample-model.safetensors"],
})

function job(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: jobId,
    status,
    created_at: "2026-10-17T09:00:00Z",
    started_at: status === "queued" ? null : "2026-10-17T09:00:09Z",
    completed_at: null,
    expires_at: "2026-10-18T09:00:00Z",
    queue_position: status === "queued" ? 3 : null,
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

export const queuedJob = job("queued")

export const runningJob = job("running", {
  progress: {
    value: 0.42,
    nodes_done: 11,
    nodes_total: 31,
    current_node: "12",
    current_node_class: "KSampler",
    step: 21,
    steps: 50,
    message: "KSampler 21/50",
  },
})

export const succeededJob = job("succeeded", {
  completed_at: "2026-10-17T09:00:51Z",
  metrics: { queue_ms: 9000, execution_ms: 42000 },
  outputs: [
    {
      node_id: "9",
      name: "ComfyUI_00001_.png",
      type: "image",
      content_type: "image/png",
      size_bytes: 1848320,
      id: outputId,
      hash: null,
      url: `https://storage.comfy.org/signed/${outputId}`,
      url_expires_at: "2026-10-17T10:00:00Z",
      job_id: jobId,
    },
    {
      node_id: "8",
      name: "latent_00001_.latent",
      type: "latent",
      content_type: "application/octet-stream",
      size_bytes: 65536,
      id: "5a6b9f8a-1c0d-4b3e-8f56-2b3e4f568a7b",
      hash: null,
      url: "https://storage.comfy.org/signed/latent",
      url_expires_at: "2026-10-17T10:00:00Z",
    },
  ],
})

export const failedJob = job("failed", {
  error: {
    code: "node_execution_error",
    message: "KSampler raised an error",
    node_id: "3",
    class_type: "KSampler",
    traceback: null,
  },
})

export const refusedJob = job("failed", {
  error: {
    code: "invalid_prompt",
    message: "ComfyUI refused the workflow",
    node_errors: {
      "22": {
        class_type: "LoraLoader",
        errors: [{ type: "value_not_in_list", message: "Value not in list" }],
      },
    },
  },
})

export function comfyV2At(baseUrl: string) {
  const jobUrl = `${baseUrl}/api/v2/jobs/${jobId}`
  return {
    submit: (body: unknown = queuedJob): Recording => ({
      method: "POST",
      url: `${baseUrl}/api/v2/jobs`,
      status: 201,
      json: body,
    }),
    read: (body: unknown): Recording => ({
      method: "GET",
      url: jobUrl,
      status: 200,
      json: body,
    }),
    content: (): Recording => ({
      method: "GET",
      url: `${baseUrl}/api/v2/assets/${outputId}/content`,
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
      bytes: pngBytes(),
    }),
    cancel: (): Recording => ({
      method: "POST",
      url: `${jobUrl}/cancel`,
      status: 200,
      json: job("canceling"),
    }),
    upload: (): Recording => ({
      method: "POST",
      url: `${baseUrl}/api/v2/assets`,
      status: 201,
      json: {
        id: uploadedId,
        hash: "blake3:9f8a1c0d",
        size_bytes: 12,
        content_type: "image/png",
        file_path: "photo.png",
        created_new: true,
        created_at: "2026-10-17T09:00:00Z",
        url: `${baseUrl}/api/v2/assets/${uploadedId}/content`,
        url_expires_at: "2026-10-17T10:00:00Z",
      },
    }),
    keyCheck: (status = 404, code = "not_found"): Recording => ({
      method: "GET",
      url: `${baseUrl}/api/v2/jobs/${unknownJobId}`,
      status,
      json: { error: { code, message: `Refused with ${code}` } },
    }),
    refusal: (
      method: Recording["method"],
      url: string,
      status: number,
      code: string,
      retryAfter?: string
    ): Recording => ({
      method,
      url,
      status,
      ...(retryAfter === undefined
        ? {}
        : { headers: { "Retry-After": retryAfter } }),
      json: { error: { code, message: `Refused with ${code}` } },
    }),
  }
}

export const comfyV2 = comfyV2At(cloudUrl)
