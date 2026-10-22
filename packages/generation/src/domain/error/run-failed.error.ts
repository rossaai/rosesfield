import { DependencyError } from "@rosesfield/kernel"

type RunFailedErrorOptions = {
  cause?: unknown
}

export class RunFailedError extends DependencyError {
  override readonly code = "RUN_FAILED"

  constructor(options: RunFailedErrorOptions) {
    super({
      message: "The engine reported that the run failed",
      cause: options.cause,
    })
  }
}
