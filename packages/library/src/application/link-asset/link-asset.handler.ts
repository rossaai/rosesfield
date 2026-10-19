import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import type { AssetStore } from "#domain/asset-store.port"
import { AssetNotFoundError } from "#domain/error/asset-not-found.error"

export type LinkAssetInput = {
  assetId: string
}

export type LinkAssetOutput = {
  url: string
}

type LinkAssetHandlerOptions = {
  assets: AssetRepository
  store: AssetStore
}

export class LinkAssetHandler {
  private readonly assets: AssetRepository
  private readonly store: AssetStore

  constructor(options: LinkAssetHandlerOptions) {
    this.assets = options.assets
    this.store = options.store
  }

  async execute(input: LinkAssetInput): Promise<LinkAssetOutput> {
    const id = assetIdFormat.parse(input.assetId)
    if ((await this.assets.get(id)) === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    return { url: await this.store.link(id) }
  }
}
