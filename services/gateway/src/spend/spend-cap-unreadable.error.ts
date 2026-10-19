import { DependencyError } from "@rosesfield/kernel"

type SpendCapUnreadableErrorOptions = {
  cause?: unknown
}

export class SpendCapUnreadableError extends DependencyError {
  override readonly code = "SPEND_CAP_UNREADABLE"

  constructor(options: SpendCapUnreadableErrorOptions) {
    super({
      message: "The spend of this deployment could not be read",
      cause: options.cause,
    })
  }
}
