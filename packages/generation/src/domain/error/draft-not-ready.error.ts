import { PreconditionFailedError } from "@rosesfield/kernel"

type DraftNotReadyErrorOptions = {
  runId: string
}

export class DraftNotReadyError extends PreconditionFailedError {
  override readonly code = "DRAFT_NOT_READY"

  constructor(options: DraftNotReadyErrorOptions) {
    super({
      message: `Run ${options.runId} is no finished draft with a last frame`,
    })
  }
}
