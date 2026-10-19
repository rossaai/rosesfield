import { InvalidArgumentError } from "#error/project.error"

type InvalidIdErrorOptions = {
  name: string
  value: string
}

export class InvalidIdError extends InvalidArgumentError {
  override readonly code = "INVALID_ID"

  constructor(options: InvalidIdErrorOptions) {
    super({
      message: `${JSON.stringify(options.value.slice(0, 80))} is not a ${options.name}`,
    })
  }
}
