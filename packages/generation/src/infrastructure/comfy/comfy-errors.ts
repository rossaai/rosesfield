import { ApiError } from "@comfyorg/sdk/low"
import type { KeyCheck } from "@rosesfield/contract"
import { ProjectError } from "@rosesfield/kernel"
import { EngineKeyInvalidError } from "#domain/error/engine-key-invalid.error"
import { EngineNoCreditsError } from "#domain/error/engine-no-credits.error"
import { EngineRateLimitedError } from "#domain/error/engine-rate-limited.error"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import { RunInputRefusedError } from "#domain/error/run-input-refused.error"

const refusedJobCodes: readonly string[] = [
  "invalid_workflow",
  "workflow_format_ui",
  "missing_asset",
  "invalid_request",
]

export async function callComfy<Result>(
  action: () => Promise<Result>
): Promise<Result> {
  try {
    return await action()
  } catch (error) {
    throw comfyErrorOf(error)
  }
}

export function comfyErrorOf(error: unknown): ProjectError {
  if (error instanceof ProjectError) {
    return error
  }
  if (!(error instanceof ApiError)) {
    return new EngineUnavailableError({ cause: error })
  }
  const status = error.httpStatus
  if (status === 401 || status === 403) {
    return new EngineKeyInvalidError({ cause: error })
  }
  if (status === 402) {
    return new EngineNoCreditsError({ cause: error })
  }
  if (status === 429 || status === 503) {
    return new EngineRateLimitedError({
      retryAfterSeconds: error.retryAfter,
      cause: error,
    })
  }
  if (status === 422 && refusedJobCodes.includes(error.code)) {
    return new RunInputRefusedError({ cause: error })
  }
  if (status >= 400 && status < 500) {
    return new RunFailedError({ cause: error })
  }
  return new EngineUnavailableError({ cause: error })
}

export function jobFailureOf(
  code: string,
  hasNodeErrors: boolean
): ProjectError {
  return hasNodeErrors || refusedJobCodes.includes(code)
    ? new RunInputRefusedError({ cause: code })
    : new RunFailedError({ cause: code })
}

export function keyCheckOf(error: unknown): KeyCheck {
  if (!(error instanceof ApiError)) {
    return "unreachable"
  }
  if (error.httpStatus === 404) {
    return "valid"
  }
  return error.httpStatus === 401 || error.httpStatus === 403
    ? "invalid"
    : "unreachable"
}
