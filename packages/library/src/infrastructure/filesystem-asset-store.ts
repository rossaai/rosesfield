import { mkdir, rename, rm } from "node:fs/promises"
import { join } from "node:path"
import { buildPath, routes } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { AssetStore } from "#domain/asset-store.port"

type FilesystemAssetStoreOptions = {
  root: string
}

export class FilesystemAssetStore extends AssetStore {
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
    await mkdir(this.root, { recursive: true })
    const target = this.pathOf(id)
    const partial = `${target}.${crypto.randomUUID()}.part`
    await Bun.write(partial, bytes)
    await rename(partial, target)
  }

  override async get(id: AssetId): Promise<Uint8Array | null> {
    const file = Bun.file(this.pathOf(id))
    if (!(await file.exists())) {
      return null
    }
    return new Uint8Array(await file.arrayBuffer())
  }

  override async delete(id: AssetId): Promise<void> {
    await rm(this.pathOf(id), { force: true })
  }

  override async link(id: AssetId): Promise<string> {
    return buildPath(routes.readAssetContent.path, { assetId: id })
  }

  private pathOf(id: AssetId): string {
    return join(this.root, id)
  }
}
