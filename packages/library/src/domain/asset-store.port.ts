import type { AssetId } from "@rosesfield/kernel"

export abstract class AssetStore {
  /** Stores the bytes of an asset under its id. */
  abstract put(id: AssetId, bytes: Uint8Array, mime: string): Promise<void>

  /** Returns the bytes of an asset, or null when none are stored. */
  abstract get(id: AssetId): Promise<Uint8Array | null>

  /** Deletes the bytes of an asset. Bytes that are not stored are no error. */
  abstract delete(id: AssetId): Promise<void>

  /** Returns the URL that serves the bytes of an asset. */
  abstract link(id: AssetId): Promise<string>
}
