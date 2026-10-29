import type { Asset, AssetKind, AssetPlace } from "@rosesfield/contract"
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
  /** Stores the record of a new asset, in the library or held out of it for the run chain that made it. */
  abstract add(asset: Asset, place?: AssetPlace): Promise<void>

  /** Returns the asset with this id, or null. */
  abstract get(id: AssetId): Promise<Asset | null>

  /** Lists the library's assets newest first, before the cursor when one is given. A held asset is never listed. */
  abstract list(page: AssetPage): Promise<Asset[]>

  /** Deletes the record of an asset. */
  abstract delete(id: AssetId): Promise<void>
}
