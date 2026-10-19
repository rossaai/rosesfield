import { InvalidArgumentError } from "@rosesfield/kernel"

type RequestInvalidErrorOptions = {
  reason: string
}

export class RequestInvalidError extends InvalidArgumentError {
  override readonly code = "REQUEST_INVALID"

  constructor(options: RequestInvalidErrorOptions) {
    super({ message: `The request is invalid: ${options.reason}` })
  }
}
