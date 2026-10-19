import { DependencyError } from "@rosesfield/kernel"

type EngineUnavailableErrorOptions = {
  cause?: unknown
}

export class EngineUnavailableError extends DependencyError {
  override readonly code = "ENGINE_UNAVAILABLE"

  constructor(options: EngineUnavailableErrorOptions) {
    super({ message: "The engine did not answer", cause: options.cause })
  }
}
