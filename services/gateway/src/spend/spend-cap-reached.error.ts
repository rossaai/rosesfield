import { PreconditionFailedError } from "@rosesfield/kernel"

type SpendCapReachedErrorOptions = {
  capCredits: number
  needed: number
  left: number
}

export class SpendCapReachedError extends PreconditionFailedError {
  override readonly code = "SPEND_CAP_REACHED"

  constructor(options: SpendCapReachedErrorOptions) {
    super({
      message: `This run needs up to ${options.needed} credits and ${options.left} are left of this deployment's cap of ${options.capCredits}`,
    })
  }
}
