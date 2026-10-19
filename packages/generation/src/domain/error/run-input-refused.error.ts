import { InvalidArgumentError } from "@rosesfield/kernel"

type RunInputRefusedErrorOptions = {
  cause?: unknown
}

export class RunInputRefusedError extends InvalidArgumentError {
  override readonly code = "RUN_INPUT_REFUSED"

  constructor(options: RunInputRefusedErrorOptions) {
    super({
      message: "The engine did not accept the inputs",
      cause: options.cause,
    })
  }
}
