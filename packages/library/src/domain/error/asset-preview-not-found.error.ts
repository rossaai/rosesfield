import { NotFoundError } from "@rosesfield/kernel"

type AssetPreviewNotFoundErrorOptions = {
  assetId: string
}

export class AssetPreviewNotFoundError extends NotFoundError {
  override readonly code = "ASSET_PREVIEW_NOT_FOUND"

  constructor(options: AssetPreviewNotFoundErrorOptions) {
    super({
      message: `The asset ${options.assetId.slice(0, 80)} has no preview`,
    })
  }
}
