import type { AssetId } from "@rosesfield/kernel"
import { AssetStore } from "#domain/asset-store.port"

export class FakeAssetStore extends AssetStore {
  readonly stored = new Map<AssetId, Uint8Array>()

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
  }

  override async link(id: AssetId): Promise<string> {
    return `memory://${id}`
  }
}
