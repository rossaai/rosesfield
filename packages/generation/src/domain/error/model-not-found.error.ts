import { NotFoundError } from "@rosesfield/kernel"

type ModelNotFoundErrorOptions = {
  model: string
}

export class ModelNotFoundError extends NotFoundError {
  override readonly code = "MODEL_NOT_FOUND"

  constructor(options: ModelNotFoundErrorOptions) {
    super({ message: `No engine here runs the model ${options.model}` })
  }
}
