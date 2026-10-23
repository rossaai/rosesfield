import { mkdir, rename, rm } from "node:fs/promises"
import { join } from "node:path"
import { buildPath, routes } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { AssetStore, type ByteRange } from "#domain/asset-store.port"

type FilesystemAssetStoreOptions = {
  root: string
}

export class FilesystemAssetStore extends AssetStore {
  static readonly previewSuffix = ".preview"

  private readonly root: string

  constructor(options: FilesystemAssetStoreOptions) {
    super()
    this.root = options.root
  }

  override async put(
    id: AssetId,
    bytes: Uint8Array,
    _mime: string
  ): Promise<void> {
    await this.write(this.pathOf(id), bytes)
  }

  override async get(id: AssetId): Promise<Uint8Array | null> {
    return this.read(this.pathOf(id))
  }

  override async getRange(
    id: AssetId,
    range: ByteRange
  ): Promise<Uint8Array | null> {
    const file = Bun.file(this.pathOf(id))
    if (!(await file.exists())) {
      return null
    }
    const part = file.slice(range.start, range.end + 1)
    return new Uint8Array(await part.arrayBuffer())
  }

  override async delete(id: AssetId): Promise<void> {
    await Promise.all([
      rm(this.pathOf(id), { force: true }),
      rm(this.previewPathOf(id), { force: true }),
    ])
  }

  override async link(id: AssetId): Promise<string> {
    return buildPath(routes.readAssetContent.path, { assetId: id })
  }

  override async putPreview(
    id: AssetId,
    bytes: Uint8Array,
    _mime: string
  ): Promise<void> {
    await this.write(this.previewPathOf(id), bytes)
  }

  override async getPreview(id: AssetId): Promise<Uint8Array | null> {
    return this.read(this.previewPathOf(id))
  }

  private async write(target: string, bytes: Uint8Array): Promise<void> {
    await mkdir(this.root, { recursive: true })
    const partial = `${target}.${crypto.randomUUID()}.part`
    await Bun.write(partial, bytes)
    await rename(partial, target)
  }

  private async read(path: string): Promise<Uint8Array | null> {
    const file = Bun.file(path)
    if (!(await file.exists())) {
      return null
    }
    return new Uint8Array(await file.arrayBuffer())
  }

  private pathOf(id: AssetId): string {
    return join(this.root, id)
  }

  private previewPathOf(id: AssetId): string {
    return join(this.root, `${id}${FilesystemAssetStore.previewSuffix}`)
  }
}
