import { PreconditionFailedError } from "@rosesfield/kernel"

type EnvInvalidErrorOptions = {
  problems: readonly string[]
}

export class EnvInvalidError extends PreconditionFailedError {
  override readonly code = "ENV_INVALID"

  constructor(options: EnvInvalidErrorOptions) {
    super({
      message: `The server settings are invalid. ${options.problems.join(" ")}`,
    })
  }
}
