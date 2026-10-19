import { DependencyError } from "@rosesfield/kernel"

type EngineNoCreditsErrorOptions = {
  cause?: unknown
}

export class EngineNoCreditsError extends DependencyError {
  override readonly code = "ENGINE_NO_CREDITS"

  constructor(options: EngineNoCreditsErrorOptions) {
    super({
      message: "The engine account has no credits left",
      cause: options.cause,
    })
  }
}
