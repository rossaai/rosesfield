import { ConflictError } from "@rosesfield/kernel"

type RunConflictErrorOptions = {
  runId: string
}

export class RunConflictError extends ConflictError {
  override readonly code = "RUN_CONFLICT"

  constructor(options: RunConflictErrorOptions) {
    super({ message: `Run ${options.runId} changed while this step read it` })
  }
}
