import { InvalidArgumentError } from "@rosesfield/kernel"

type AssetPreviewInvalidErrorOptions = {
  reason: string
}

export class AssetPreviewInvalidError extends InvalidArgumentError {
  override readonly code = "ASSET_PREVIEW_INVALID"

  constructor(options: AssetPreviewInvalidErrorOptions) {
    super({ message: `The preview is refused: ${options.reason}` })
  }
}
