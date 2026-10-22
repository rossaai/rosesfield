import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetRepository } from "#domain/asset.repository"
import type { AssetStore } from "#domain/asset-store.port"
import { AssetNotFoundError } from "#domain/error/asset-not-found.error"
import { AssetPreviewNotFoundError } from "#domain/error/asset-preview-not-found.error"
import { type PreviewFormat, previewFormatOf } from "#domain/preview-format"

export type ReadAssetPreviewInput = {
  assetId: string
}

export type ReadAssetPreviewOutput = {
  bytes: Uint8Array
  mime: PreviewFormat
}

type ReadAssetPreviewHandlerOptions = {
  assets: AssetRepository
  store: AssetStore
}

export class ReadAssetPreviewHandler {
  private readonly assets: AssetRepository
  private readonly store: AssetStore

  constructor(options: ReadAssetPreviewHandlerOptions) {
    this.assets = options.assets
    this.store = options.store
  }

  async execute(input: ReadAssetPreviewInput): Promise<ReadAssetPreviewOutput> {
    const id = assetIdFormat.parse(input.assetId)
    if ((await this.assets.get(id)) === null) {
      throw new AssetNotFoundError({ assetId: input.assetId })
    }
    const bytes = await this.store.getPreview(id)
    const mime = bytes === null ? null : previewFormatOf(bytes)
    if (bytes === null || mime === null) {
      throw new AssetPreviewNotFoundError({ assetId: input.assetId })
    }
    return { bytes, mime }
  }
}
