import { NotFoundError } from "@rosesfield/kernel"

type RunNotFoundErrorOptions = {
  runId: string
}

export class RunNotFoundError extends NotFoundError {
  override readonly code = "RUN_NOT_FOUND"

  constructor(options: RunNotFoundErrorOptions) {
    super({ message: `No run has the id ${options.runId}` })
  }
}
