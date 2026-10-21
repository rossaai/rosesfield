import { type ErrorBody, errorBody } from "@rosesfield/contract"
import {
  ComfyRouterGenerationEngine,
  EngineKeyInvalidError,
  EngineKeyOutsideWorkspaceError,
  EngineNoCreditsError,
  EngineNotEnabledError,
  EngineRateLimitedError,
  EngineUnavailableError,
} from "@rosesfield/generation"
import type { ProjectError } from "@rosesfield/kernel"
import { AgentAnswerFailedError } from "#domain/error/agent-answer-failed.error"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"
import { routerChat } from "#infrastructure/router-chat-models"

export type Fetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type RouterChatCall = {
  cost: number | null
}

type RouterChatFetchOptions = {
  keyOf: () => string | null
  fetch: Fetch
  call: RouterChatCall
}

type Refusal = {
  status: number
  errorType: string | null
  detail: string
  retryAfterSeconds: number | null
}

const refusalMark = "rosesfield-refusal"
const refusalPattern = new RegExp(
  `${refusalMark}:([A-Z][A-Z0-9_]*):([45][0-9]{2})`
)
const streamFields: readonly string[] = ["stream", "stream_options"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function fieldOf(value: unknown, name: string): unknown {
  return isRecord(value) ? value[name] : undefined
}

function textOf(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export function routerChatUrl(): string {
  const base = ComfyRouterGenerationEngine.routerUrl
  return `${base}/v2/models/${routerChat.route}`
}

export function routerBodyOf(sent: unknown): string {
  const parsed: unknown = typeof sent === "string" ? JSON.parse(sent) : {}
  const body = isRecord(parsed) ? parsed : {}
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(body).filter(([name]) => !streamFields.includes(name))
    )
  )
}

export async function idempotencyKeyOf(body: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body)
  )
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  return `agent-${hex}`
}

export function costOf(answer: unknown): number | null {
  const cost = fieldOf(fieldOf(answer, "usage"), "cost")
  return typeof cost === "number" && Number.isFinite(cost) && cost >= 0
    ? cost
    : null
}

function toolCallsOf(message: unknown): unknown[] | undefined {
  const calls = fieldOf(message, "tool_calls")
  if (!Array.isArray(calls) || calls.length === 0) {
    return undefined
  }
  return calls.map((call: unknown, index) => ({
    index,
    id: fieldOf(call, "id"),
    type: "function",
    function: {
      name: fieldOf(fieldOf(call, "function"), "name"),
      arguments: fieldOf(fieldOf(call, "function"), "arguments") ?? "{}",
    },
  }))
}

export function eventStreamOf(answer: unknown): Response {
  const choices = fieldOf(answer, "choices")
  const choice: unknown = Array.isArray(choices) ? choices[0] : undefined
  const message = fieldOf(choice, "message")
  const calls = toolCallsOf(message)
  const chunk = {
    id: textOf(fieldOf(answer, "id")) ?? "router-chat",
    object: "chat.completion.chunk",
    created: fieldOf(answer, "created") ?? 0,
    model: fieldOf(answer, "model") ?? routerChat.route,
    choices: [
      {
        index: 0,
        delta: {
          role: "assistant",
          content: textOf(fieldOf(message, "content")),
          ...(calls === undefined ? {} : { tool_calls: calls }),
        },
        finish_reason:
          textOf(fieldOf(choice, "finish_reason")) ??
          (calls === undefined ? "stop" : "tool_calls"),
      },
    ],
    ...(isRecord(fieldOf(answer, "usage"))
      ? { usage: fieldOf(answer, "usage") }
      : {}),
  }
  return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  })
}

async function refusalOf(response: Response): Promise<Refusal> {
  const text = await response.text().catch(() => "")
  let body: unknown = null
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }
  const retryAfter = Number(response.headers.get("retry-after"))
  return {
    status: response.status,
    errorType:
      response.headers.get("x-comfy-error-type") ??
      textOf(fieldOf(body, "error_type")),
    detail: textOf(fieldOf(body, "detail")) ?? "",
    retryAfterSeconds:
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  }
}

export function routerChatErrorOf(refusal: Refusal): ProjectError {
  const { status, errorType } = refusal
  if (errorType === "not_enabled") {
    return /workspace/i.test(refusal.detail)
      ? new EngineKeyOutsideWorkspaceError({ cause: refusal })
      : new EngineNotEnabledError({ cause: refusal })
  }
  if (status === 401 || errorType === "unauthorized") {
    return new EngineKeyInvalidError({ cause: refusal })
  }
  if (status === 402 || errorType === "insufficient_credits") {
    return new EngineNoCreditsError({ cause: refusal })
  }
  if (
    status === 429 ||
    errorType === "rate_limited" ||
    errorType === "concurrency_limit_exceeded"
  ) {
    return new EngineRateLimitedError({
      retryAfterSeconds: refusal.retryAfterSeconds,
      cause: refusal,
    })
  }
  return status >= 500
    ? new EngineUnavailableError({ cause: refusal })
    : new AgentAnswerFailedError({ reason: errorType ?? `status ${status}` })
}

export function refusalTextOf(error: ProjectError): string {
  return `${refusalMark}:${error.code}:${error.status}`
}

export function refusalResponse(error: ProjectError): Response {
  return Response.json(
    { error: { message: refusalTextOf(error) } },
    { status: 400 }
  )
}

export function refusalBodyOf(detail: unknown): ErrorBody | null {
  const found = typeof detail === "string" ? refusalPattern.exec(detail) : null
  const parsed = errorBody.safeParse({
    code: found?.[1],
    status: Number(found?.[2]),
  })
  return parsed.success ? parsed.data : null
}

function signalOf(init: RequestInit | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(routerChat.timeoutMs)
  return init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
}

export function routerChatFetch(options: RouterChatFetchOptions): Fetch {
  return async (_input, init) => {
    const key = options.keyOf()
    if (key === null) {
      return refusalResponse(new AgentModelMissingError())
    }
    const body = routerBodyOf(init?.body)
    const response = await options.fetch(routerChatUrl(), {
      method: "POST",
      headers: {
        "X-API-Key": key,
        "Content-Type": "application/json",
        "Idempotency-Key": await idempotencyKeyOf(body),
      },
      body,
      signal: signalOf(init),
    })
    if (!response.ok) {
      return refusalResponse(routerChatErrorOf(await refusalOf(response)))
    }
    const answer: unknown = await response.json()
    options.call.cost = costOf(answer)
    return eventStreamOf(answer)
  }
}
