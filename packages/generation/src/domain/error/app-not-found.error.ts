import { NotFoundError } from "@rosesfield/kernel"

type AppNotFoundErrorOptions = {
  appId: string
}

export class AppNotFoundError extends NotFoundError {
  override readonly code = "APP_NOT_FOUND"

  constructor(options: AppNotFoundErrorOptions) {
    super({
      message: `No app has the id ${JSON.stringify(options.appId.slice(0, 80))}`,
    })
  }
}
