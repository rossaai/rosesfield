import type { Asset } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import { AssetNotFoundError } from "#domain/error/asset-not-found.error"

export type GetAssetInput = {
  assetId: string
}

export type GetAssetOutput = {
  asset: Asset
}

type GetAssetHandlerOptions = {
  assets: AssetRepository
}

export class GetAssetHandler {
  private readonly assets: AssetRepository

  constructor(options: GetAssetHandlerOptions) {
    this.assets = options.assets
  }

  async execute(input: GetAssetInput): Promise<GetAssetOutput> {
    const asset = await this.assets.get(assetIdFormat.parse(input.assetId))
    if (asset === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    return { asset }
  }
}
