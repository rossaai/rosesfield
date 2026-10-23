import { asset as assetSchema } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { ListAssetsHandler } from "#application/list-assets/list-assets.handler"
import { libraryFor, png, runUuid, uploadImage } from "../harness"

const missing = "6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d"

function upload(
  library: ReturnType<typeof libraryFor>,
  mime: string,
  bytes = png
) {
  return library.upload.execute({
    bytes,
    mime,
    sourceRunId: null,
    width: null,
    height: null,
    durationSeconds: null,
  })
}

describe("UploadAssetHandler", () => {
  it("stores the bytes and a record of the asset's kind and size", async () => {
    const library = libraryFor()
    const { asset } = await library.upload.execute({
      bytes: png,
      mime: "Image/PNG; charset=binary",
      sourceRunId: runUuid,
      width: 1024,
      height: 576,
      durationSeconds: null,
    })
    expect(assetSchema.parse(asset)).toEqual(asset)
    expect(asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      bytes: png.length,
      width: 1024,
      sourceRunId: runUuid,
      createdAt: "2026-10-17T09:00:00.000Z",
    })
    expect(library.store.stored.get(asset.id)).toEqual(png)
    expect(await library.assets.get(asset.id)).toEqual(asset)
  })

  it("keeps a GLB a run made as a mesh, with no width, height or length", async () => {
    const library = libraryFor()
    const { asset } = await library.upload.execute({
      bytes: png,
      mime: "model/gltf-binary",
      sourceRunId: runUuid,
      width: null,
      height: null,
      durationSeconds: null,
    })
    expect(asset).toMatchObject({
      kind: "mesh",
      mime: "model/gltf-binary",
      sourceRunId: runUuid,
    })
    expect(await library.assets.get(asset.id)).toEqual(asset)
  })

  it("refuses a file the library does not keep", async () => {
    await expect(upload(libraryFor(), "application/pdf")).rejects.toMatchObject(
      {
        code: "ASSET_KIND_UNSUPPORTED",
        status: 400,
      }
    )
  })

  it("refuses a file past the size limit", async () => {
    const library = libraryFor()
    await expect(
      upload(library, "image/png", new Uint8Array(65))
    ).rejects.toMatchObject({ code: "ASSET_TOO_LARGE" })
    expect(library.store.stored.size).toBe(0)
  })

  it("refuses a size that is not a whole number of pixels", async () => {
    const library = libraryFor()
    await expect(
      library.upload.execute({
        bytes: png,
        mime: "image/png",
        sourceRunId: null,
        width: 0,
        height: 10,
        durationSeconds: null,
      })
    ).rejects.toMatchObject({ code: "ASSET_INVALID" })
    expect(library.store.stored.size).toBe(0)
  })

  it("removes the bytes again when the record cannot be stored", async () => {
    const library = libraryFor()
    library.db.$client.exec("DROP TABLE assets")
    await expect(upload(library, "image/png")).rejects.toThrow()
    expect(library.store.stored.size).toBe(0)
  })
})

describe("ListAssetsHandler", () => {
  it("lists newest first, by kind, a page at a time", async () => {
    const library = libraryFor()
    const images: string[] = []
    for (let index = 0; index < ListAssetsHandler.pageSize + 1; index += 1) {
      images.push(await uploadImage(library))
      library.clock.advance(1000)
    }
    await upload(library, "audio/wav")
    const first = await library.listAssets.execute({
      kind: "image",
      cursor: null,
    })
    expect(first.assets).toHaveLength(ListAssetsHandler.pageSize)
    expect(first.assets[0]?.id).toBe(images.at(-1))
    const second = await library.listAssets.execute({
      kind: "image",
      cursor: first.next,
    })
    expect(second.assets.map((asset) => asset.id)).toEqual([images[0]])
    expect(second.next).toBeNull()
    const all = await library.listAssets.execute({ kind: null, cursor: null })
    expect(all.assets[0]?.kind).toBe("audio")
  })

  it("refuses a cursor it did not return", async () => {
    await expect(
      libraryFor().listAssets.execute({ kind: null, cursor: "next-page" })
    ).rejects.toMatchObject({ code: "ASSET_CURSOR_INVALID" })
  })
})

describe("reading an asset", () => {
  it("returns the record, the bytes and the link of a stored asset", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    expect((await library.getAsset.execute({ assetId })).asset.id).toBe(assetId)
    const content = await library.readContent.execute({ assetId })
    expect(content.bytes).toEqual(png)
    expect(content.asset.mime).toBe("image/png")
    expect(await library.link.execute({ assetId })).toEqual({
      url: `memory://${assetId}`,
    })
  })

  it("refuses an asset whose record or bytes are gone", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    library.store.stored.clear()
    for (const read of [
      () => library.getAsset.execute({ assetId: missing }),
      () => library.readContent.execute({ assetId }),
      () => library.link.execute({ assetId: missing }),
    ]) {
      await expect(read()).rejects.toMatchObject({
        code: "ASSET_NOT_FOUND",
        status: 404,
      })
    }
  })
})

describe("DeleteAssetHandler", () => {
  it("deletes the record and the bytes", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    await library.deleteAsset.execute({ assetId })
    await expect(library.getAsset.execute({ assetId })).rejects.toMatchObject({
      code: "ASSET_NOT_FOUND",
    })
    expect(library.store.stored.size).toBe(0)
  })

  it("refuses to delete a reference of a character and keeps it", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    await library.createCharacter.execute({
      name: "Mara",
      references: [assetId],
      notes: "",
    })
    await expect(
      library.deleteAsset.execute({ assetId })
    ).rejects.toMatchObject({
      code: "ASSET_IN_USE",
      status: 409,
    })
    expect(library.store.stored.size).toBe(1)
  })

  it("refuses an asset that is not stored", async () => {
    await expect(
      libraryFor().deleteAsset.execute({ assetId: missing })
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" })
  })
})
