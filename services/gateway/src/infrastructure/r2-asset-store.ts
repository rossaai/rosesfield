import { buildPath, routes } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { AssetStore, type ByteRange } from "@rosesfield/library"

type R2AssetStoreOptions = {
  bucket: R2Bucket
}

export class R2AssetStore extends AssetStore {
  static readonly prefix = "assets/"
  static readonly previewSuffix = ".preview"

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
    return this.read(this.keyOf(id))
  }

  override async getRange(
    id: AssetId,
    range: ByteRange
  ): Promise<Uint8Array | null> {
    const object = await this.bucket.get(this.keyOf(id), {
      range: { offset: range.start, length: range.end - range.start + 1 },
    })
    return object === null ? null : new Uint8Array(await object.arrayBuffer())
  }

  override async delete(id: AssetId): Promise<void> {
    await this.bucket.delete([this.keyOf(id), this.previewKeyOf(id)])
  }

  override async link(id: AssetId): Promise<string> {
    return buildPath(routes.readAssetContent.path, { assetId: id })
  }

  override async putPreview(
    id: AssetId,
    bytes: Uint8Array,
    mime: string
  ): Promise<void> {
    await this.bucket.put(this.previewKeyOf(id), new Uint8Array(bytes), {
      httpMetadata: { contentType: mime },
    })
  }

  override async getPreview(id: AssetId): Promise<Uint8Array | null> {
    return this.read(this.previewKeyOf(id))
  }

  private async read(key: string): Promise<Uint8Array | null> {
    const object = await this.bucket.get(key)
    return object === null ? null : new Uint8Array(await object.arrayBuffer())
  }

  private keyOf(id: AssetId): string {
    return `${R2AssetStore.prefix}${id}`
  }

  private previewKeyOf(id: AssetId): string {
    return `${this.keyOf(id)}${R2AssetStore.previewSuffix}`
  }
}
