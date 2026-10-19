import { PreconditionFailedError } from "@rosesfield/kernel"

type SpendCapReachedErrorOptions = {
  capCredits: number
}

export class SpendCapReachedError extends PreconditionFailedError {
  override readonly code = "SPEND_CAP_REACHED"

  constructor(options: SpendCapReachedErrorOptions) {
    super({
      message: `This deployment has spent its cap of ${options.capCredits} credits`,
    })
  }
}
