import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import { CharacterReferenceInvalidError } from "#domain/error/character-reference-invalid.error"

export async function checkReferences(
  assets: AssetRepository,
  references: readonly string[]
): Promise<AssetId[]> {
  const ids = references.map((reference) => assetIdFormat.parse(reference))
  const found = await Promise.all(ids.map((id) => assets.get(id)))
  found.forEach((asset, index) => {
    if (asset === null || asset.kind !== "image") {
      throw new CharacterReferenceInvalidError({ assetId: ids[index] ?? "" })
    }
  })
  return ids
}
