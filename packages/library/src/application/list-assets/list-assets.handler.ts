import type { Asset, AssetKind } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import type { AssetCursor, AssetRepository } from "#domain/asset.repository"
import { AssetCursorInvalidError } from "#domain/error/asset-cursor-invalid.error"

export type ListAssetsInput = {
  kind: AssetKind | null
  cursor: string | null
}

export type ListAssetsOutput = {
  assets: Asset[]
  next: string | null
}

type ListAssetsHandlerOptions = {
  assets: AssetRepository
}

export class ListAssetsHandler {
  static readonly pageSize = 60
  static readonly cursorPattern: RegExp = /^(\d{1,15})-(.+)$/

  private readonly assets: AssetRepository

  constructor(options: ListAssetsHandlerOptions) {
    this.assets = options.assets
  }

  async execute(input: ListAssetsInput): Promise<ListAssetsOutput> {
    const found = await this.assets.list({
      kind: input.kind,
      before: input.cursor === null ? null : this.readCursor(input.cursor),
      limit: ListAssetsHandler.pageSize + 1,
    })
    const page = found.slice(0, ListAssetsHandler.pageSize)
    const last = page.at(-1)
    const hasMore = found.length > ListAssetsHandler.pageSize
    return {
      assets: page,
      next:
        hasMore && last !== undefined
          ? `${Date.parse(last.createdAt)}-${last.id}`
          : null,
    }
  }

  private readCursor(cursor: string): AssetCursor {
    const match = ListAssetsHandler.cursorPattern.exec(cursor)
    const time = match?.[1]
    const id = match?.[2]
    if (time === undefined || id === undefined || !assetIdFormat.is(id)) {
      throw new AssetCursorInvalidError({ cursor })
    }
    return { createdAt: new Date(Number(time)), id }
  }
}
