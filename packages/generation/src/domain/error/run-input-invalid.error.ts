import { inputNamesOf } from "@rosesfield/contract"
import { InvalidArgumentError } from "@rosesfield/kernel"

type RunInputInvalidErrorOptions = {
  appId: string
  issues: readonly string[]
}

export class RunInputInvalidError extends InvalidArgumentError {
  override readonly code = "RUN_INPUT_INVALID"

  constructor(options: RunInputInvalidErrorOptions) {
    super({
      message: `The inputs break the rules of ${options.appId}: ${options.issues.join(". ")}`,
      inputs: inputNamesOf(options.issues),
    })
  }
}
