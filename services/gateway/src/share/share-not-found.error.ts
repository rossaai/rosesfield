import { NotFoundError } from "@rosesfield/kernel"

type ShareNotFoundErrorOptions = {
  shareId: string
}

export class ShareNotFoundError extends NotFoundError {
  override readonly code = "SHARE_NOT_FOUND"

  constructor(options: ShareNotFoundErrorOptions) {
    super({ message: `No share has the id ${options.shareId}` })
  }
}
