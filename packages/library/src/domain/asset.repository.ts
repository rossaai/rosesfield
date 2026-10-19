import type { Asset, AssetKind } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"

export type AssetCursor = {
  createdAt: Date
  id: AssetId
}

export type AssetPage = {
  kind: AssetKind | null
  before: AssetCursor | null
  limit: number
}

export abstract class AssetRepository {
  /** Stores the record of a new asset. */
  abstract add(asset: Asset): Promise<void>

  /** Returns the asset with this id, or null. */
  abstract get(id: AssetId): Promise<Asset | null>

  /** Lists assets newest first, before the cursor when one is given. */
  abstract list(page: AssetPage): Promise<Asset[]>

  /** Deletes the record of an asset. */
  abstract delete(id: AssetId): Promise<void>
}
