import type { AssetId } from "@rosesfield/kernel"

export type ByteRange = {
  start: number
  end: number
}

export abstract class AssetStore {
  /** Stores the bytes of an asset under its id. */
  abstract put(id: AssetId, bytes: Uint8Array, mime: string): Promise<void>

  /** Returns the bytes of an asset, or null when none are stored. */
  abstract get(id: AssetId): Promise<Uint8Array | null>

  /** Returns the bytes of an asset from start to end, both included, or null when none are stored. */
  async getRange(id: AssetId, range: ByteRange): Promise<Uint8Array | null> {
    const bytes = await this.get(id)
    return bytes === null ? null : bytes.slice(range.start, range.end + 1)
  }

  /** Deletes the bytes of an asset and its preview. Bytes that are not stored are no error. */
  abstract delete(id: AssetId): Promise<void>

  /** Returns the URL that serves the bytes of an asset. */
  abstract link(id: AssetId): Promise<string>

  /** Stores the preview of an asset beside its bytes, in place of any earlier preview. */
  abstract putPreview(
    id: AssetId,
    bytes: Uint8Array,
    mime: string
  ): Promise<void>

  /** Returns the preview of an asset, or null when it has none. */
  abstract getPreview(id: AssetId): Promise<Uint8Array | null>
}
