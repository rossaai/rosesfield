import type { AssetId } from "@rosesfield/kernel"
import { AssetStore } from "@rosesfield/library"

export class FakeAssetStore extends AssetStore {
  readonly stored = new Map<AssetId, Uint8Array>()
  readonly previews = new Map<AssetId, Uint8Array>()

  override async put(
    id: AssetId,
    bytes: Uint8Array,
    _mime: string
  ): Promise<void> {
    this.stored.set(id, new Uint8Array(bytes))
  }

  override async get(id: AssetId): Promise<Uint8Array | null> {
    const bytes = this.stored.get(id)
    return bytes === undefined ? null : new Uint8Array(bytes)
  }

  override async delete(id: AssetId): Promise<void> {
    this.stored.delete(id)
    this.previews.delete(id)
  }

  override async link(id: AssetId): Promise<string> {
    return `memory://${id}`
  }

  override async putPreview(
    id: AssetId,
    bytes: Uint8Array,
    _mime: string
  ): Promise<void> {
    this.previews.set(id, new Uint8Array(bytes))
  }

  override async getPreview(id: AssetId): Promise<Uint8Array | null> {
    const bytes = this.previews.get(id)
    return bytes === undefined ? null : new Uint8Array(bytes)
  }
}
