import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assetIdFormat } from "@rosesfield/kernel"
import { afterAll, describe, expect, it } from "vitest"
import type { AssetStore } from "#domain/asset-store.port"
import { FilesystemAssetStore } from "#infrastructure/filesystem-asset-store"
import { FakeAssetStore } from "../fake/fake-asset-store"
import { png } from "../harness"

const folders: string[] = []

afterAll(async () => {
  await Promise.all(
    folders.map((folder) => rm(folder, { recursive: true, force: true }))
  )
})

const subjects: { name: string; create: () => Promise<AssetStore> }[] = [
  { name: "the fake store", create: async () => new FakeAssetStore() },
  {
    name: "the filesystem store",
    create: async () => {
      const folder = await mkdtemp(join(tmpdir(), "rosesfield-assets-"))
      folders.push(folder)
      return new FilesystemAssetStore({ root: join(folder, "assets") })
    },
  },
]

const id = assetIdFormat.parse("0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f")

describe.each(subjects)("AssetStore contract: $name", ({ create }) => {
  it("returns the bytes it stored, as a copy", async () => {
    const store = await create()
    const bytes = new Uint8Array(png)
    await store.put(id, bytes, "image/png")
    bytes.fill(0)
    expect(await store.get(id)).toEqual(png)
  })

  it("returns null for bytes it does not hold", async () => {
    expect(await (await create()).get(id)).toBeNull()
  })

  it("replaces the bytes of an id stored twice", async () => {
    const store = await create()
    await store.put(id, png, "image/png")
    await store.put(id, Uint8Array.of(1, 2), "image/png")
    expect(await store.get(id)).toEqual(Uint8Array.of(1, 2))
  })

  it("deletes bytes and takes a second delete as no error", async () => {
    const store = await create()
    await store.put(id, png, "image/png")
    await store.delete(id)
    await store.delete(id)
    expect(await store.get(id)).toBeNull()
  })

  it("returns the bytes of a range, both ends included", async () => {
    const store = await create()
    await store.put(id, Uint8Array.of(0, 1, 2, 3, 4, 5), "video/mp4")
    expect(await store.getRange(id, { start: 2, end: 4 })).toEqual(
      Uint8Array.of(2, 3, 4)
    )
    expect(await store.getRange(id, { start: 0, end: 0 })).toEqual(
      Uint8Array.of(0)
    )
  })

  it("returns null for a range of bytes it does not hold", async () => {
    const store = await create()
    expect(await store.getRange(id, { start: 0, end: 1 })).toBeNull()
  })

  it("keeps a preview beside the bytes and replaces it when sent again", async () => {
    const store = await create()
    await store.put(id, png, "image/png")
    expect(await store.getPreview(id)).toBeNull()
    await store.putPreview(id, Uint8Array.of(7, 7), "image/webp")
    await store.putPreview(id, Uint8Array.of(8), "image/webp")
    expect(await store.getPreview(id)).toEqual(Uint8Array.of(8))
    expect(await store.get(id)).toEqual(png)
  })

  it("deletes the preview with the bytes", async () => {
    const store = await create()
    await store.put(id, png, "image/png")
    await store.putPreview(id, Uint8Array.of(7), "image/webp")
    await store.delete(id)
    expect(await store.getPreview(id)).toBeNull()
  })

  it("links each asset to its own URL", async () => {
    const store = await create()
    const other = assetIdFormat.parse("6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d")
    const link = await store.link(id)
    expect(link).toContain(id)
    expect(await store.link(other)).not.toBe(link)
  })
})

describe("FilesystemAssetStore", () => {
  it("serves its bytes from the asset content route", async () => {
    const store = new FilesystemAssetStore({ root: "/tmp/unused" })
    expect(await store.link(id)).toBe(`/api/assets/${id}/content`)
  })

  it("leaves one file per asset and no partial file", async () => {
    const folder = await mkdtemp(join(tmpdir(), "rosesfield-assets-"))
    folders.push(folder)
    const store = new FilesystemAssetStore({ root: folder })
    await store.put(id, png, "image/png")
    expect(await readdir(folder)).toEqual([id])
  })

  it("reads a range from disk without reading the whole file", async () => {
    const folder = await mkdtemp(join(tmpdir(), "rosesfield-assets-"))
    folders.push(folder)
    const store = new FilesystemAssetStore({ root: folder })
    await store.put(id, Uint8Array.of(9, 8, 7, 6), "video/mp4")
    const whole = store.get.bind(store)
    store.get = () => Promise.reject(new Error("read the whole file"))
    expect(await store.getRange(id, { start: 1, end: 2 })).toEqual(
      Uint8Array.of(8, 7)
    )
    store.get = whole
  })
})
