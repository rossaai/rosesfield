import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import type { AssetStore } from "#domain/asset-store.port"
import type { CharacterRepository } from "#domain/character.repository"
import { AssetInUseError } from "#domain/error/asset-in-use.error"
import { AssetNotFoundError } from "#domain/error/asset-not-found.error"

export type DeleteAssetInput = {
  assetId: string
}

type DeleteAssetHandlerOptions = {
  assets: AssetRepository
  store: AssetStore
  characters: CharacterRepository
}

export class DeleteAssetHandler {
  private readonly assets: AssetRepository
  private readonly store: AssetStore
  private readonly characters: CharacterRepository

  constructor(options: DeleteAssetHandlerOptions) {
    this.assets = options.assets
    this.store = options.store
    this.characters = options.characters
  }

  async execute(input: DeleteAssetInput): Promise<void> {
    const id = assetIdFormat.parse(input.assetId)
    if ((await this.assets.get(id)) === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    const users = await this.characters.listUsing(id)
    if (users.length > 0) {
      throw new AssetInUseError({
        assetId: id,
        characterIds: users.map((character) => character.id),
      })
    }
    await this.assets.delete(id)
    await this.store.delete(id)
  }
}
