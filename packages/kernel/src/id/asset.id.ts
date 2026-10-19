import type { Brand } from "#brand"
import { IdFormat } from "#id/id-format"

export type AssetId = Brand<string, "AssetId">

export const assetIdFormat: IdFormat<AssetId> = new IdFormat<AssetId>({
  name: "asset id",
  pattern: IdFormat.uuidPattern,
})
