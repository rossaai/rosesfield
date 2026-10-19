import type { Asset } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import type { AssetStore } from "#domain/asset-store.port"
import { AssetNotFoundError } from "#domain/error/asset-not-found.error"

export type ReadAssetContentInput = {
  assetId: string
}

export type ReadAssetContentOutput = {
  asset: Asset
  bytes: Uint8Array
}

type ReadAssetContentHandlerOptions = {
  assets: AssetRepository
  store: AssetStore
}

export class ReadAssetContentHandler {
  private readonly assets: AssetRepository
  private readonly store: AssetStore

  constructor(options: ReadAssetContentHandlerOptions) {
    this.assets = options.assets
    this.store = options.store
  }

  async execute(input: ReadAssetContentInput): Promise<ReadAssetContentOutput> {
    const id = assetIdFormat.parse(input.assetId)
    const asset = await this.assets.get(id)
    const bytes = asset === null ? null : await this.store.get(id)
    if (asset === null || bytes === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    return { asset, bytes }
  }
}
