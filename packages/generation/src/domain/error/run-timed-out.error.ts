import { DependencyError } from "@rosesfield/kernel"

type RunTimedOutErrorOptions = {
  runId: string
  limitSeconds: number
}

export class RunTimedOutError extends DependencyError {
  override readonly code = "RUN_TIMED_OUT"

  constructor(options: RunTimedOutErrorOptions) {
    super({
      message: `Run ${options.runId} passed its limit of ${options.limitSeconds} seconds`,
    })
  }
}
