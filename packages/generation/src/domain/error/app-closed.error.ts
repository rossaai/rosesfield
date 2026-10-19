import { ConflictError } from "@rosesfield/kernel"

type AppClosedErrorOptions = {
  appId: string
}

export class AppClosedError extends ConflictError {
  override readonly code = "APP_CLOSED"

  constructor(options: AppClosedErrorOptions) {
    super({
      message: `${options.appId} takes no run yet`,
    })
  }
}
