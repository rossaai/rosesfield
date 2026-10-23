export type ErrorStatus = 400 | 404 | 409 | 412 | 429 | 502

type ProjectErrorOptions = {
  message: string
  cause?: unknown
  inputs?: readonly string[]
}

type RateLimitedErrorOptions = ProjectErrorOptions & {
  retryAfterSeconds?: number
}

export abstract class ProjectError extends Error {
  static readonly codePattern: RegExp = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/
  abstract readonly code: string
  abstract readonly status: ErrorStatus
  /** The names of the inputs a refusal names, never their values. */
  readonly inputs: readonly string[]

  constructor(options: ProjectErrorOptions) {
    super(
      options.message,
      options.cause === undefined ? undefined : { cause: options.cause }
    )
    this.name = new.target.name
    this.inputs = options.inputs ?? []
  }
}

export abstract class InvalidArgumentError extends ProjectError {
  override readonly status = 400
}

export abstract class NotFoundError extends ProjectError {
  override readonly status = 404
}

export abstract class ConflictError extends ProjectError {
  override readonly status = 409
}

export abstract class PreconditionFailedError extends ProjectError {
  override readonly status = 412
}

export abstract class RateLimitedError extends ProjectError {
  override readonly status = 429
  readonly retryAfterSeconds: number | null

  constructor(options: RateLimitedErrorOptions) {
    super(options)
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
  }
}

export abstract class DependencyError extends ProjectError {
  override readonly status = 502
}
