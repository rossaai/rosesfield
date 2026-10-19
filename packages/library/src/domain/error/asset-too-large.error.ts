import { InvalidArgumentError } from "@rosesfield/kernel"

type AssetTooLargeErrorOptions = {
  bytes: number
  maxBytes: number
}

export class AssetTooLargeError extends InvalidArgumentError {
  override readonly code = "ASSET_TOO_LARGE"

  constructor(options: AssetTooLargeErrorOptions) {
    super({
      message: `An asset of ${options.bytes} bytes passes the limit of ${options.maxBytes} bytes`,
    })
  }
}
