import type { Asset } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { type AssetPage, AssetRepository } from "@rosesfield/library"

export class FakeAssetRepository extends AssetRepository {
  private readonly stored = new Map<AssetId, Asset>()

  override async add(asset: Asset): Promise<void> {
    this.stored.set(asset.id, asset)
  }

  override async get(id: AssetId): Promise<Asset | null> {
    return this.stored.get(id) ?? null
  }

  override async list(page: AssetPage): Promise<Asset[]> {
    return [...this.stored.values()]
      .filter((asset) => page.kind === null || asset.kind === page.kind)
      .slice(0, page.limit)
  }

  override async delete(id: AssetId): Promise<void> {
    this.stored.delete(id)
  }
}
