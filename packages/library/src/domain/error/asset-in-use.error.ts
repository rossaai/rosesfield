import { ConflictError } from "@rosesfield/kernel"

type AssetInUseErrorOptions = {
  assetId: string
  characterIds: readonly string[]
}

export class AssetInUseError extends ConflictError {
  override readonly code = "ASSET_IN_USE"

  constructor(options: AssetInUseErrorOptions) {
    super({
      message: `Asset ${options.assetId} is a reference of ${options.characterIds.length} characters`,
    })
  }
}
