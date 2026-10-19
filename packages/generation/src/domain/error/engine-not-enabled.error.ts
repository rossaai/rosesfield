import { PreconditionFailedError } from "@rosesfield/kernel"

type EngineNotEnabledErrorOptions = {
  cause?: unknown
}

export class EngineNotEnabledError extends PreconditionFailedError {
  override readonly code = "ENGINE_NOT_ENABLED"

  constructor(options: EngineNotEnabledErrorOptions) {
    super({
      message: "The engine has not turned hosted models on for this account",
      cause: options.cause,
    })
  }
}
