import type { Fetch } from "@rosesfield/generation"
import { pngBytes } from "../sample-apps"

export type ComfyCall = {
  method: string
  path: string
  authorization: string | null
  idempotencyKey: string | null
}

export type FakeComfy = {
  fetch: Fetch
  calls: ComfyCall[]
}

const jobId = "7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b"
const outputId = "2b3e4f56-8a7b-4c2d-9e4f-5a6b9f8a1c0d"

function job(status: "queued" | "succeeded"): Record<string, unknown> {
  return {
    id: jobId,
    status,
    created_at: "2026-10-17T09:00:00Z",
    progress: null,
    error: null,
    outputs:
      status === "succeeded"
        ? [
            {
              id: outputId,
              node_id: "9",
              type: "image",
              content_type: "image/png",
              name: "ComfyUI_00001_.png",
            },
          ]
        : [],
  }
}

function notFound(): Response {
  return Response.json(
    { error: { code: "not_found", message: "No job has this id" } },
    { status: 404 }
  )
}

function refused(): Response {
  return Response.json(
    { error: { code: "unauthorized", message: "The key is not valid" } },
    { status: 401 }
  )
}

function answer(method: string, path: string, key: string | null): Response {
  if (key?.includes("refused") === true) {
    return refused()
  }
  if (method === "POST" && path === "/api/v2/jobs") {
    return Response.json(job("queued"), { status: 201 })
  }
  if (method === "GET" && path === `/api/v2/jobs/${jobId}`) {
    return Response.json(job("succeeded"))
  }
  if (method === "GET" && path === `/api/v2/assets/${outputId}/content`) {
    return new Response(pngBytes, { headers: { "content-type": "image/png" } })
  }
  return notFound()
}

export function fakeComfy(): FakeComfy {
  const calls: ComfyCall[] = []
  const fetch: Fetch = async (input, init) => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(String(input), init)
    const path = new URL(request.url).pathname
    calls.push({
      method: request.method,
      path,
      authorization: request.headers.get("authorization"),
      idempotencyKey: request.headers.get("idempotency-key"),
    })
    return answer(request.method, path, request.headers.get("authorization"))
  }
  return { fetch, calls }
}
