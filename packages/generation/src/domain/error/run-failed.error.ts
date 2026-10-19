import { DependencyError } from "@rosesfield/kernel"

type RunFailedErrorOptions = {
  cause?: unknown
}

export class RunFailedError extends DependencyError {
  override readonly code = "RUN_FAILED"

  constructor(options: RunFailedErrorOptions) {
    super({
      message: "The run failed and the engine gave no reason",
      cause: options.cause,
    })
  }
}
