import { PreconditionFailedError } from "@rosesfield/kernel"

type EngineBindingInvalidErrorOptions = {
  adapter: string
  reason: string
}

export class EngineBindingInvalidError extends PreconditionFailedError {
  override readonly code = "ENGINE_BINDING_INVALID"

  constructor(options: EngineBindingInvalidErrorOptions) {
    super({
      message: `The engine binding for ${options.adapter} is invalid: ${options.reason}`,
    })
  }
}
