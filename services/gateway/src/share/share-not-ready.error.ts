import { PreconditionFailedError } from "@rosesfield/kernel"

type ShareNotReadyErrorOptions = {
  runId: string
}

export class ShareNotReadyError extends PreconditionFailedError {
  override readonly code = "SHARE_NOT_READY"

  constructor(options: ShareNotReadyErrorOptions) {
    super({
      message: `Run ${options.runId} has no finished output to share`,
    })
  }
}
