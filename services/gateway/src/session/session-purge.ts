import { runTable } from "@rosesfield/generation"
import { assetIdFormat, type Clock } from "@rosesfield/kernel"
import {
  type AssetStore,
  assetTable,
  characterTable,
} from "@rosesfield/library"
import { and, eq, inArray, lt, or, type SQL } from "drizzle-orm"
import { referencing } from "#infrastructure/sqlite-character-repository"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import {
  type SessionRecordKind,
  sessionLimitTable,
  sessionRecordTable,
} from "#session/session-tables"

type SessionPurgeOptions = {
  db: SqliteDatabase
  store: AssetStore
  clock: Clock
  retentionDays: number
}

export type PurgeCount = {
  runs: number
  assets: number
  characters: number
}

export class SessionPurge {
  static readonly batch = 50
  static readonly dayMs = 86_400_000

  private readonly db: SqliteDatabase
  private readonly store: AssetStore
  private readonly clock: Clock
  private readonly retentionMs: number

  constructor(options: SessionPurgeOptions) {
    this.db = options.db
    this.store = options.store
    this.clock = options.clock
    this.retentionMs = options.retentionDays * SessionPurge.dayMs
  }

  cutoff(): number {
    return this.clock.now().getTime() - this.retentionMs
  }

  async run(): Promise<PurgeCount> {
    const cutoff = this.cutoff()
    const count: PurgeCount = { runs: 0, assets: 0, characters: 0 }
    for (;;) {
      const ids = await this.oldAssets(cutoff)
      if (ids.length === 0) {
        break
      }
      count.characters += await this.deleteCharacters(
        or(...ids.map((id) => referencing(id)))
      )
      await Promise.all(
        ids.map((id) => this.store.delete(assetIdFormat.parse(id)))
      )
      await this.db.delete(assetTable).where(inArray(assetTable.id, ids))
      await this.forget("asset", ids)
      count.assets += ids.length
    }
    count.characters += await this.deleteCharacters(
      lt(characterTable.createdAt, cutoff)
    )
    count.runs += await this.deleteRuns(cutoff)
    await this.db
      .delete(sessionRecordTable)
      .where(lt(sessionRecordTable.createdAt, cutoff))
    await this.db
      .delete(sessionLimitTable)
      .where(
        lt(
          sessionLimitTable.windowStart,
          this.clock.now().getTime() - SessionPurge.dayMs
        )
      )
    return count
  }

  private async oldAssets(cutoff: number): Promise<string[]> {
    const rows = await this.db
      .select({ id: assetTable.id })
      .from(assetTable)
      .where(lt(assetTable.createdAt, cutoff))
      .limit(SessionPurge.batch)
    return rows.map((row) => row.id)
  }

  private async deleteCharacters(condition: SQL | undefined): Promise<number> {
    let deleted = 0
    for (;;) {
      const rows = await this.db
        .select({ id: characterTable.id })
        .from(characterTable)
        .where(condition)
        .limit(SessionPurge.batch)
      const ids = rows.map((row) => row.id)
      if (ids.length === 0) {
        return deleted
      }
      await this.db
        .delete(characterTable)
        .where(inArray(characterTable.id, ids))
      await this.forget("character", ids)
      deleted += ids.length
    }
  }

  private async deleteRuns(cutoff: number): Promise<number> {
    let deleted = 0
    for (;;) {
      const rows = await this.db
        .select({ id: runTable.id })
        .from(runTable)
        .where(lt(runTable.createdAt, cutoff))
        .limit(SessionPurge.batch)
      const ids = rows.map((row) => row.id)
      if (ids.length === 0) {
        return deleted
      }
      await this.db.delete(runTable).where(inArray(runTable.id, ids))
      await this.forget("run", ids)
      deleted += ids.length
    }
  }

  private async forget(
    kind: SessionRecordKind,
    ids: readonly string[]
  ): Promise<void> {
    await this.db
      .delete(sessionRecordTable)
      .where(
        and(
          eq(sessionRecordTable.kind, kind),
          inArray(sessionRecordTable.recordId, [...ids])
        )
      )
  }
}
