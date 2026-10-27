import { describe, expect, it } from "vitest"
import { ReadAssetContentHandler } from "#application/read-asset-content/read-asset-content.handler"
import { UploadAssetHandler } from "#application/upload-asset/upload-asset.handler"
import { type Library, libraryFor, uploadImage } from "../harness"

const missing = "6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
const webp = Uint8Array.of(
  0x52,
  0x49,
  0x46,
  0x46,
  0x0c,
  0,
  0,
  0,
  0x57,
  0x45,
  0x42,
  0x50,
  0x56,
  0x50,
  0x38,
  0x20
)
const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 0x10)

async function uploadOf(
  library: Library,
  mime: string,
  bytes: Uint8Array
): Promise<string> {
  const { asset } = await library.upload.execute({
    bytes,
    mime,
    sourceRunId: null,
    width: null,
    height: null,
    durationSeconds: null,
  })
  return asset.id
}

const sixBytes = Uint8Array.of(10, 11, 12, 13, 14, 15)

describe("ReadAssetContentHandler with a range", () => {
  it("reads only the bytes the range asks for, against the asset's size", async () => {
    const library = libraryFor()
    const assetId = await uploadOf(library, "video/mp4", sixBytes)
    const sizes: number[] = []
    const read = await library.readContent.execute({
      assetId,
      rangeOf: (size) => {
        sizes.push(size)
        return { start: 2, end: 4 }
      },
    })
    expect(sizes).toEqual([6])
    expect(read.bytes).toEqual(Uint8Array.of(12, 13, 14))
    expect(read.range).toEqual({ start: 2, end: 4 })
  })

  it("reads the whole file with no range", async () => {
    const library = libraryFor()
    const assetId = await uploadOf(library, "video/mp4", sixBytes)
    const read = await library.readContent.execute({ assetId })
    expect(read.bytes).toEqual(sixBytes)
    expect(read.range).toBeNull()
  })

  it.each([
    { start: 6, end: 6 },
    { start: 4, end: 3 },
    { start: 0, end: 6 },
    { start: -1, end: 2 },
  ])(
    "answers a range outside the file, $start-$end, as unsatisfiable",
    async (range) => {
      const library = libraryFor()
      const assetId = await uploadOf(library, "video/mp4", sixBytes)
      const read = await library.readContent.execute({
        assetId,
        rangeOf: () => range,
      })
      expect(read.range).toBe("unsatisfiable")
      expect(read.bytes).toHaveLength(0)
    }
  )

  it("serves at most 8 MiB of an open range in one answer", async () => {
    const library = libraryFor()
    const upload = new UploadAssetHandler({
      assets: library.assets,
      store: library.store,
      clock: library.clock,
    })
    const size = ReadAssetContentHandler.maxRangeBytes + 10
    const { asset } = await upload.execute({
      bytes: new Uint8Array(size),
      mime: "video/mp4",
      sourceRunId: null,
      width: null,
      height: null,
      durationSeconds: null,
    })
    const read = await library.readContent.execute({
      assetId: asset.id,
      rangeOf: (whole) => ({ start: 5, end: whole - 1 }),
    })
    expect(read.range).toEqual({
      start: 5,
      end: 5 + ReadAssetContentHandler.maxRangeBytes - 1,
    })
    expect(read.bytes).toHaveLength(ReadAssetContentHandler.maxRangeBytes)
  })
})

describe("PutAssetPreviewHandler", () => {
  it("keeps a WebP or a JPEG preview beside an image or a video", async () => {
    const library = libraryFor()
    const image = await uploadImage(library)
    const video = await uploadOf(library, "video/mp4", sixBytes)
    await library.putPreview.execute({
      assetId: image,
      bytes: webp,
      mime: "image/webp",
    })
    await library.putPreview.execute({
      assetId: video,
      bytes: jpeg,
      mime: "image/jpeg; q=1",
    })
    expect(await library.readPreview.execute({ assetId: image })).toEqual({
      bytes: webp,
      mime: "image/webp",
    })
    expect(await library.readPreview.execute({ assetId: video })).toEqual({
      bytes: jpeg,
      mime: "image/jpeg",
    })
  })

  it("keeps a 3D model's still under the same type and size caps", async () => {
    const library = libraryFor()
    const mesh = await uploadOf(library, "model/gltf-binary", sixBytes)
    const oversize = new Uint8Array(64 * 1024 + 1)
    oversize.set(webp)
    await expect(
      library.putPreview.execute({
        assetId: mesh,
        bytes: oversize,
        mime: "image/webp",
      })
    ).rejects.toMatchObject({ code: "ASSET_TOO_LARGE" })
    await expect(
      library.putPreview.execute({
        assetId: mesh,
        bytes: jpeg,
        mime: "image/webp",
      })
    ).rejects.toMatchObject({ code: "ASSET_PREVIEW_INVALID" })
    expect(library.store.previews.size).toBe(0)
    await library.putPreview.execute({
      assetId: mesh,
      bytes: webp,
      mime: "image/webp",
    })
    expect(await library.readPreview.execute({ assetId: mesh })).toEqual({
      bytes: webp,
      mime: "image/webp",
    })
  })

  it("refuses bytes that are not the type they are sent as", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    await expect(
      library.putPreview.execute({ assetId, bytes: jpeg, mime: "image/webp" })
    ).rejects.toMatchObject({ code: "ASSET_PREVIEW_INVALID", status: 400 })
    await expect(
      library.putPreview.execute({
        assetId,
        bytes: Uint8Array.of(1, 2, 3),
        mime: "image/webp",
      })
    ).rejects.toMatchObject({ code: "ASSET_PREVIEW_INVALID" })
    expect(library.store.previews.size).toBe(0)
  })

  it("refuses a preview past 64 KB", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    const bytes = new Uint8Array(64 * 1024 + 1)
    bytes.set(jpeg)
    await expect(
      library.putPreview.execute({ assetId, bytes, mime: "image/jpeg" })
    ).rejects.toMatchObject({ code: "ASSET_TOO_LARGE" })
    const fits = new Uint8Array(64 * 1024)
    fits.set(jpeg)
    await library.putPreview.execute({
      assetId,
      bytes: fits,
      mime: "image/jpeg",
    })
    expect([...library.store.previews.values()][0]).toHaveLength(64 * 1024)
  })

  it("refuses an asset of another owner and an asset with no picture", async () => {
    const library = libraryFor()
    await expect(
      library.putPreview.execute({
        assetId: missing,
        bytes: webp,
        mime: "image/webp",
      })
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND", status: 404 })
    const sound = await uploadOf(library, "audio/wav", sixBytes)
    await expect(
      library.putPreview.execute({
        assetId: sound,
        bytes: webp,
        mime: "image/webp",
      })
    ).rejects.toMatchObject({ code: "ASSET_PREVIEW_INVALID" })
  })
})

describe("ReadAssetPreviewHandler", () => {
  it("answers an asset with no preview as not found", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    await expect(
      library.readPreview.execute({ assetId })
    ).rejects.toMatchObject({ code: "ASSET_PREVIEW_NOT_FOUND", status: 404 })
    await expect(
      library.readPreview.execute({ assetId: missing })
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" })
  })
})

describe("DeleteAssetHandler and the preview", () => {
  it("deletes the preview with its asset", async () => {
    const library = libraryFor()
    const assetId = await uploadImage(library)
    await library.putPreview.execute({
      assetId,
      bytes: webp,
      mime: "image/webp",
    })
    await library.deleteAsset.execute({ assetId })
    expect(library.store.previews.size).toBe(0)
  })
})
