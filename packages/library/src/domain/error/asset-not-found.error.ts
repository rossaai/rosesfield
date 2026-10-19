import { NotFoundError } from "@rosesfield/kernel"

type AssetNotFoundErrorOptions = {
  assetId: string
}

export class AssetNotFoundError extends NotFoundError {
  override readonly code = "ASSET_NOT_FOUND"

  constructor(options: AssetNotFoundErrorOptions) {
    super({ message: `No asset has the id ${options.assetId.slice(0, 80)}` })
  }
}
