import { PreconditionFailedError } from "@rosesfield/kernel"

type RunFinishedErrorOptions = {
  runId: string
  status: string
}

export class RunFinishedError extends PreconditionFailedError {
  override readonly code = "RUN_FINISHED"

  constructor(options: RunFinishedErrorOptions) {
    super({
      message: `Run ${options.runId} is ${options.status} and takes no further step`,
    })
  }
}
