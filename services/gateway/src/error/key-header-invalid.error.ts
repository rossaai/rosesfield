import { InvalidArgumentError } from "@rosesfield/kernel"

type KeyHeaderInvalidErrorOptions = {
  header: string
}

export class KeyHeaderInvalidError extends InvalidArgumentError {
  override readonly code = "KEY_HEADER_INVALID"

  constructor(options: KeyHeaderInvalidErrorOptions) {
    super({
      message: `The ${options.header} header holds a value no key can hold`,
    })
  }
}
