import { buildPath, routes } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { AssetStore } from "@rosesfield/library"

type R2AssetStoreOptions = {
  bucket: R2Bucket
}

export class R2AssetStore extends AssetStore {
  static readonly prefix = "assets/"

  private readonly bucket: R2Bucket

  constructor(options: R2AssetStoreOptions) {
    super()
    this.bucket = options.bucket
  }

  override async put(
    id: AssetId,
    bytes: Uint8Array,
    mime: string
  ): Promise<void> {
    await this.bucket.put(this.keyOf(id), new Uint8Array(bytes), {
      httpMetadata: { contentType: mime },
    })
  }

  override async get(id: AssetId): Promise<Uint8Array | null> {
    const object = await this.bucket.get(this.keyOf(id))
    return object === null ? null : new Uint8Array(await object.arrayBuffer())
  }

  override async delete(id: AssetId): Promise<void> {
    await this.bucket.delete(this.keyOf(id))
  }

  override async link(id: AssetId): Promise<string> {
    return buildPath(routes.readAssetContent.path, { assetId: id })
  }

  private keyOf(id: AssetId): string {
    return `${R2AssetStore.prefix}${id}`
  }
}
