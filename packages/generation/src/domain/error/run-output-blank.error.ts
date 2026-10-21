import { DependencyError } from "@rosesfield/kernel"

type RunOutputBlankErrorOptions = {
  dropped: number
}

export class RunOutputBlankError extends DependencyError {
  override readonly code = "RUN_OUTPUT_BLANK"

  constructor(options: RunOutputBlankErrorOptions) {
    super({
      message: `Every output of the run was black or empty, and ${options.dropped} were dropped`,
    })
  }
}
