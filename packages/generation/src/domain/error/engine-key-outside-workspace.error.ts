import { PreconditionFailedError } from "@rosesfield/kernel"

type EngineKeyOutsideWorkspaceErrorOptions = {
  cause?: unknown
}

export class EngineKeyOutsideWorkspaceError extends PreconditionFailedError {
  override readonly code = "ENGINE_KEY_OUTSIDE_WORKSPACE"

  constructor(options: EngineKeyOutsideWorkspaceErrorOptions) {
    super({
      message: "The key belongs to no workspace, so hosted models refuse it",
      cause: options.cause,
    })
  }
}
