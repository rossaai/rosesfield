import { InvalidArgumentError } from "@rosesfield/kernel"

type BodyTooLargeErrorOptions = {
  maxBytes: number
}

export class BodyTooLargeError extends InvalidArgumentError {
  override readonly code = "BODY_TOO_LARGE"

  constructor(options: BodyTooLargeErrorOptions) {
    super({
      message: `The request body passes the limit of ${options.maxBytes} bytes`,
    })
  }
}
