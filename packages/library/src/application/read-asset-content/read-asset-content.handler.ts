import type { Asset } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import type { AssetStore, ByteRange } from "#domain/asset-store.port"
import { AssetNotFoundError } from "#domain/error/asset-not-found.error"

export type ReadAssetContentInput = {
  assetId: string
  rangeOf?: (size: number) => ByteRange | null
}

export type ServedRange = ByteRange | "unsatisfiable" | null

export type ReadAssetContentOutput = {
  asset: Asset
  bytes: Uint8Array
  range: ServedRange
}

type ReadAssetContentHandlerOptions = {
  assets: AssetRepository
  store: AssetStore
}

export class ReadAssetContentHandler {
  static readonly maxRangeBytes = 8 * 1024 * 1024

  private readonly assets: AssetRepository
  private readonly store: AssetStore

  constructor(options: ReadAssetContentHandlerOptions) {
    this.assets = options.assets
    this.store = options.store
  }

  async execute(input: ReadAssetContentInput): Promise<ReadAssetContentOutput> {
    const id = assetIdFormat.parse(input.assetId)
    const asset = await this.assets.get(id)
    if (asset === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    const asked = input.rangeOf?.(asset.bytes) ?? null
    if (asked !== null && !isWithin(asked, asset.bytes)) {
      return { asset, bytes: new Uint8Array(0), range: "unsatisfiable" }
    }
    const range = asked === null ? null : capped(asked)
    const bytes =
      range === null
        ? await this.store.get(id)
        : await this.store.getRange(id, range)
    if (bytes === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    return {
      asset,
      bytes,
      range:
        range === null || bytes.length === 0
          ? null
          : { start: range.start, end: range.start + bytes.length - 1 },
    }
  }
}

function isWithin(range: ByteRange, size: number): boolean {
  return (
    Number.isSafeInteger(range.start) &&
    Number.isSafeInteger(range.end) &&
    range.start >= 0 &&
    range.start <= range.end &&
    range.end < size
  )
}

function capped(range: ByteRange): ByteRange {
  const last = range.start + ReadAssetContentHandler.maxRangeBytes - 1
  return { start: range.start, end: Math.min(range.end, last) }
}
