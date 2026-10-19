import { InvalidArgumentError } from "@rosesfield/kernel"

type MissingPathParamErrorOptions = {
  path: string
  name: string
}

export class MissingPathParamError extends InvalidArgumentError {
  override readonly code = "MISSING_PATH_PARAM"

  constructor(options: MissingPathParamErrorOptions) {
    super({ message: `${options.path} needs a value for ${options.name}` })
  }
}
