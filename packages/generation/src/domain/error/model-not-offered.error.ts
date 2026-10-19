import { InvalidArgumentError } from "@rosesfield/kernel"

type ModelNotOfferedErrorOptions = {
  appId: string
  model: string
}

export class ModelNotOfferedError extends InvalidArgumentError {
  override readonly code = "MODEL_NOT_OFFERED"

  constructor(options: ModelNotOfferedErrorOptions) {
    super({
      message: `The app ${options.appId} does not offer the model ${options.model}`,
    })
  }
}
