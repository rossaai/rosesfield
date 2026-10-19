import type { ProjectError } from "@rosesfield/kernel"
import { EngineKeyInvalidError } from "#domain/error/engine-key-invalid.error"
import { EngineKeyOutsideWorkspaceError } from "#domain/error/engine-key-outside-workspace.error"
import { EngineNoCreditsError } from "#domain/error/engine-no-credits.error"
import { EngineNotEnabledError } from "#domain/error/engine-not-enabled.error"
import { EngineRateLimitedError } from "#domain/error/engine-rate-limited.error"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { ModelNotFoundError } from "#domain/error/model-not-found.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import { RunInputRefusedError } from "#domain/error/run-input-refused.error"

export type RouterRefusal = {
  status: number
  errorType: string | null
  detail: string
  retryAfterSeconds: number | null
  model: string
}

const unavailableTypes: readonly string[] = [
  "provider_error",
  "provider_timeout",
  "deadline_exceeded",
  "service_unavailable",
  "internal_error",
  "queue_backlog_full",
  "client_disconnected",
]

const refusedTypes: readonly string[] = [
  "invalid_input",
  "content_policy_violation",
]

export async function refusalOf(
  response: Response,
  model: string
): Promise<RouterRefusal> {
  const text = await response.text().catch(() => "")
  const body = parseJson(text)
  const errorType =
    response.headers.get("x-comfy-error-type") ?? stringAt(body, "error_type")
  return {
    status: response.status,
    errorType,
    detail: stringAt(body, "detail") ?? "",
    retryAfterSeconds: retryAfterOf(response),
    model,
  }
}

export function routerErrorOf(refusal: RouterRefusal): ProjectError {
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
  if (errorType === "model_not_found") {
    return new ModelNotFoundError({ model: refusal.model })
  }
  if (
    status === 429 ||
    errorType === "concurrency_limit_exceeded" ||
    errorType === "rate_limited"
  ) {
    return new EngineRateLimitedError({
      retryAfterSeconds: refusal.retryAfterSeconds,
      cause: refusal,
    })
  }
  return failureOf(errorType, status, refusal)
}

export function failureOf(
  errorType: string | null,
  status: number,
  cause: unknown
): ProjectError {
  if (errorType !== null && refusedTypes.includes(errorType)) {
    return new RunInputRefusedError({ cause })
  }
  if (status === 422) {
    return new RunInputRefusedError({ cause })
  }
  if (
    status >= 500 ||
    (errorType !== null && unavailableTypes.includes(errorType))
  ) {
    return new EngineUnavailableError({ cause })
  }
  return new RunFailedError({ cause })
}

export function retryAfterOf(response: Response): number | null {
  const value = Number(response.headers.get("retry-after"))
  return Number.isFinite(value) && value > 0 ? value : null
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function stringAt(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const found: unknown = Object.getOwnPropertyDescriptor(value, key)?.value
  return typeof found === "string" ? found : null
}
