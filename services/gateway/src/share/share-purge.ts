import { assetIdFormat, type Clock } from "@rosesfield/kernel"
import type { AssetStore } from "@rosesfield/library"
import type { SqliteShareRepository } from "#share/sqlite-share-repository"

type SharePurgeOptions = {
  shares: SqliteShareRepository
  store: AssetStore
  clock: Clock
}

export class SharePurge {
  static readonly batch = 50

  private readonly shares: SqliteShareRepository
  private readonly store: AssetStore
  private readonly clock: Clock

  constructor(options: SharePurgeOptions) {
    this.shares = options.shares
    this.store = options.store
    this.clock = options.clock
  }

  async run(): Promise<number> {
    let removed = 0
    for (;;) {
      const expired = await this.shares.expired(
        this.clock.now().getTime(),
        SharePurge.batch
      )
      if (expired.length === 0) {
        return removed
      }
      for (const record of expired) {
        const keys = record.media.map((media) => media.key)
        await Promise.all(
          keys.map((key) => this.store.delete(assetIdFormat.parse(key)))
        )
        await this.shares.remove(record.id)
        removed += 1
      }
    }
  }
}
