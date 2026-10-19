import { InvalidArgumentError } from "@rosesfield/kernel"

type AssetKindUnsupportedErrorOptions = {
  mime: string
}

export class AssetKindUnsupportedError extends InvalidArgumentError {
  override readonly code = "ASSET_KIND_UNSUPPORTED"

  constructor(options: AssetKindUnsupportedErrorOptions) {
    super({
      message: `The library keeps images, video, audio and text, not ${JSON.stringify(options.mime.slice(0, 80))}`,
    })
  }
}
