type RunStoppedErrorOptions = {
  step: string
  code: string | null
}

export class RunStoppedError extends Error {
  static readonly failedCode = "RUN_FAILED"

  readonly code: string

  constructor(options: RunStoppedErrorOptions) {
    super(`The ${options.step} of a chain ended with no result`)
    this.name = "RunStoppedError"
    this.code = options.code ?? RunStoppedError.failedCode
  }
}
