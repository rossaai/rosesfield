import type { AssetKind } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import type { AssetStore } from "#domain/asset-store.port"
import { AssetNotFoundError } from "#domain/error/asset-not-found.error"
import { AssetPreviewInvalidError } from "#domain/error/asset-preview-invalid.error"
import { AssetTooLargeError } from "#domain/error/asset-too-large.error"
import { previewFormatOf } from "#domain/preview-format"

export type PutAssetPreviewInput = {
  assetId: string
  bytes: Uint8Array
  mime: string
}

type PutAssetPreviewHandlerOptions = {
  assets: AssetRepository
  store: AssetStore
}

export class PutAssetPreviewHandler {
  static readonly maxBytes = 64 * 1024
  static readonly pictured: ReadonlySet<AssetKind> = new Set([
    "image",
    "video",
    "mesh",
  ])

  private readonly assets: AssetRepository
  private readonly store: AssetStore

  constructor(options: PutAssetPreviewHandlerOptions) {
    this.assets = options.assets
    this.store = options.store
  }

  async execute(input: PutAssetPreviewInput): Promise<void> {
    const id = assetIdFormat.parse(input.assetId)
    const asset = await this.assets.get(id)
    if (asset === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    if (!PutAssetPreviewHandler.pictured.has(asset.kind)) {
      throw new AssetPreviewInvalidError({
        reason: `a ${asset.kind} asset shows no picture`,
      })
    }
    if (input.bytes.length > PutAssetPreviewHandler.maxBytes) {
      throw new AssetTooLargeError({
        bytes: input.bytes.length,
        maxBytes: PutAssetPreviewHandler.maxBytes,
      })
    }
    const mime = input.mime.split(";")[0]?.trim().toLowerCase() ?? ""
    const format = previewFormatOf(input.bytes)
    if (format === null || format !== mime) {
      throw new AssetPreviewInvalidError({
        reason: "its bytes are not a WebP, a JPEG or a PNG of its type",
      })
    }
    await this.store.putPreview(id, input.bytes, format)
  }
}
