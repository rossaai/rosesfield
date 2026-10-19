import { DependencyError } from "@rosesfield/kernel"

type EngineKeyInvalidErrorOptions = {
  cause?: unknown
}

export class EngineKeyInvalidError extends DependencyError {
  override readonly code = "ENGINE_KEY_INVALID"

  constructor(options: EngineKeyInvalidErrorOptions) {
    super({ message: "The engine refused the key", cause: options.cause })
  }
}
