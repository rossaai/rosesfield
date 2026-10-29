import {
  type Asset,
  type AssetPlace,
  asset as assetSchema,
} from "@rosesfield/contract"
import { assetIdFormat, type Clock } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import { kindOfMime } from "#domain/asset-kind"
import type { AssetStore } from "#domain/asset-store.port"
import { AssetInvalidError } from "#domain/error/asset-invalid.error"
import { AssetKindUnsupportedError } from "#domain/error/asset-kind-unsupported.error"
import { AssetTooLargeError } from "#domain/error/asset-too-large.error"

export type UploadAssetInput = {
  bytes: Uint8Array
  mime: string
  sourceRunId: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
  place?: AssetPlace
}

export type UploadAssetOutput = {
  asset: Asset
}

type UploadAssetHandlerOptions = {
  assets: AssetRepository
  store: AssetStore
  clock: Clock
  maxBytes?: number
}

export class UploadAssetHandler {
  static readonly maxBytes = 512 * 1024 * 1024

  private readonly assets: AssetRepository
  private readonly store: AssetStore
  private readonly clock: Clock
  private readonly maxBytes: number

  constructor(options: UploadAssetHandlerOptions) {
    this.assets = options.assets
    this.store = options.store
    this.clock = options.clock
    this.maxBytes = options.maxBytes ?? UploadAssetHandler.maxBytes
  }

  async execute(input: UploadAssetInput): Promise<UploadAssetOutput> {
    const mime = input.mime.split(";")[0]?.trim().toLowerCase() ?? ""
    const kind = kindOfMime(mime)
    if (kind === null) {
      throw new AssetKindUnsupportedError({ mime })
    }
    if (input.bytes.length > this.maxBytes) {
      throw new AssetTooLargeError({
        bytes: input.bytes.length,
        maxBytes: this.maxBytes,
      })
    }
    const parsed = assetSchema.safeParse({
      id: assetIdFormat.parse(crypto.randomUUID()),
      kind,
      mime,
      bytes: input.bytes.length,
      width: input.width,
      height: input.height,
      durationSeconds: input.durationSeconds,
      sourceRunId: input.sourceRunId,
      createdAt: this.clock.now().toISOString(),
    })
    if (!parsed.success) {
      throw new AssetInvalidError({
        issues: parsed.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`
        ),
      })
    }
    const asset = parsed.data
    await this.store.put(asset.id, input.bytes, asset.mime)
    try {
      await this.assets.add(asset, input.place ?? "library")
    } catch (error) {
      await this.store.delete(asset.id)
      throw error
    }
    return { asset }
  }
}
