import { type AssetId, FixedClock } from "@rosesfield/kernel"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { CreateCharacterHandler } from "#application/create-character/create-character.handler"
import { DeleteAssetHandler } from "#application/delete-asset/delete-asset.handler"
import { DeleteCharacterHandler } from "#application/delete-character/delete-character.handler"
import { GetAssetHandler } from "#application/get-asset/get-asset.handler"
import { GetCharacterHandler } from "#application/get-character/get-character.handler"
import { LinkAssetHandler } from "#application/link-asset/link-asset.handler"
import { ListAssetsHandler } from "#application/list-assets/list-assets.handler"
import { ListCharactersHandler } from "#application/list-characters/list-characters.handler"
import { PutAssetPreviewHandler } from "#application/put-asset-preview/put-asset-preview.handler"
import { ReadAssetContentHandler } from "#application/read-asset-content/read-asset-content.handler"
import { ReadAssetPreviewHandler } from "#application/read-asset-preview/read-asset-preview.handler"
import { UpdateCharacterHandler } from "#application/update-character/update-character.handler"
import { UploadAssetHandler } from "#application/upload-asset/upload-asset.handler"
import { migrateLibraryTables } from "#infrastructure/bun-sqlite-library-migration"
import { DrizzleAssetRepository } from "#infrastructure/drizzle-asset-repository"
import { DrizzleCharacterRepository } from "#infrastructure/drizzle-character-repository"
import { FakeAssetStore } from "./fake/fake-asset-store"

export const start = new Date("2026-10-17T09:00:00.000Z")
export const runUuid = "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f"
export const png = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)

export type Library = ReturnType<typeof libraryFor>

export function libraryFor() {
  const db = drizzle(":memory:")
  migrateLibraryTables(db)
  const clock = new FixedClock({ now: start })
  const assets = new DrizzleAssetRepository({ db })
  const characters = new DrizzleCharacterRepository({ db })
  const store = new FakeAssetStore()
  return {
    db,
    clock,
    assets,
    characters,
    store,
    upload: new UploadAssetHandler({ assets, store, clock, maxBytes: 64 }),
    listAssets: new ListAssetsHandler({ assets }),
    getAsset: new GetAssetHandler({ assets }),
    readContent: new ReadAssetContentHandler({ assets, store }),
    deleteAsset: new DeleteAssetHandler({ assets, store, characters }),
    link: new LinkAssetHandler({ assets, store }),
    putPreview: new PutAssetPreviewHandler({ assets, store }),
    readPreview: new ReadAssetPreviewHandler({ assets, store }),
    createCharacter: new CreateCharacterHandler({ characters, assets, clock }),
    listCharacters: new ListCharactersHandler({ characters }),
    getCharacter: new GetCharacterHandler({ characters }),
    updateCharacter: new UpdateCharacterHandler({ characters, assets }),
    deleteCharacter: new DeleteCharacterHandler({ characters }),
  }
}

export async function uploadImage(library: Library): Promise<AssetId> {
  const { asset } = await library.upload.execute({
    bytes: png,
    mime: "image/png",
    sourceRunId: null,
    width: 1,
    height: 1,
    durationSeconds: null,
  })
  return asset.id
}
