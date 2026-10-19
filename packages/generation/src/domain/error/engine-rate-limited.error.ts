import { RateLimitedError } from "@rosesfield/kernel"

type EngineRateLimitedErrorOptions = {
  retryAfterSeconds: number | null
  cause?: unknown
}

export class EngineRateLimitedError extends RateLimitedError {
  override readonly code = "ENGINE_RATE_LIMITED"

  constructor(options: EngineRateLimitedErrorOptions) {
    super({
      message: "The engine refused more requests for a time",
      cause: options.cause,
      ...(options.retryAfterSeconds === null
        ? {}
        : { retryAfterSeconds: options.retryAfterSeconds }),
    })
  }
}
