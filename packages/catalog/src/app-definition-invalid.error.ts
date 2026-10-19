import { PreconditionFailedError } from "@rosesfield/kernel"

type AppDefinitionInvalidErrorOptions = {
  folder: string
  reason: string
}

export class AppDefinitionInvalidError extends PreconditionFailedError {
  override readonly code = "APP_DEFINITION_INVALID"

  constructor(options: AppDefinitionInvalidErrorOptions) {
    super({
      message: `The app in ${options.folder} is invalid: ${options.reason}`,
    })
  }
}
