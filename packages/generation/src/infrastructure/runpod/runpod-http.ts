import type { ProjectError } from "@rosesfield/kernel"
import { EngineKeyInvalidError } from "#domain/error/engine-key-invalid.error"
import { EngineRateLimitedError } from "#domain/error/engine-rate-limited.error"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import { RunInputRefusedError } from "#domain/error/run-input-refused.error"
import type { Fetch } from "#infrastructure/comfy/comfy-low"

type SendOptions = {
  fetch: Fetch
  url: string
  method: "GET" | "POST"
  apiKey: string
  body?: string
  timeoutMs: number
}

const refusedStatuses: readonly number[] = [400, 413, 422]

export async function sendRunPod(options: SendOptions): Promise<Response> {
  const headers = new Headers({ Authorization: `Bearer ${options.apiKey}` })
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }
  let response: Response
  try {
    response = await options.fetch(options.url, {
      method: options.method,
      headers,
      ...(options.body === undefined ? {} : { body: options.body }),
      signal: AbortSignal.timeout(options.timeoutMs),
    })
  } catch (error) {
    throw new EngineUnavailableError({ cause: error })
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw runPodErrorOf(response)
  }
  return response
}

export async function jsonOf(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    throw new EngineUnavailableError({ cause: error })
  }
}

function runPodErrorOf(response: Response): ProjectError {
  const { status } = response
  const cause = status
  if (status === 401 || status === 403) {
    return new EngineKeyInvalidError({ cause })
  }
  if (status === 429) {
    return new EngineRateLimitedError({
      retryAfterSeconds: retryAfterOf(response.headers.get("Retry-After")),
      cause,
    })
  }
  if (refusedStatuses.includes(status)) {
    return new RunInputRefusedError({ cause })
  }
  if (status >= 400 && status < 500) {
    return new RunFailedError({ cause })
  }
  return new EngineUnavailableError({ cause })
}

function retryAfterOf(header: string | null): number | null {
  if (header === null || !/^\d{1,6}$/.test(header.trim())) {
    return null
  }
  return Number(header.trim())
}
