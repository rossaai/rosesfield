import { RateLimitedError } from "@rosesfield/kernel"

type SessionRateLimitedErrorOptions = {
  limit: number
  retryAfterSeconds: number
}

export class SessionRateLimitedError extends RateLimitedError {
  override readonly code = "SESSION_RATE_LIMITED"

  constructor(options: SessionRateLimitedErrorOptions) {
    super({
      message: `This session sent more than ${options.limit} requests in one minute`,
      retryAfterSeconds: options.retryAfterSeconds,
    })
  }
}
