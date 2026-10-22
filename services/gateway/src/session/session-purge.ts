import { RouterCatalog, runTable } from "@rosesfield/generation"
import { assetIdFormat, type Clock } from "@rosesfield/kernel"
import {
  type AssetStore,
  assetTable,
  characterTable,
} from "@rosesfield/library"
import {
  and,
  eq,
  gte,
  inArray,
  lt,
  notExists,
  or,
  type SQL,
  sql,
} from "drizzle-orm"
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core"
import { referencing } from "#infrastructure/sqlite-character-repository"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import {
  type SessionRecordKind,
  sessionLimitTable,
  sessionRecordTable,
  sessionVisitTable,
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
      const ids = await this.idsOf(
        assetTable,
        assetTable.id,
        this.isStale("asset", assetTable.id, assetTable.createdAt, cutoff)
      )
      if (ids.length === 0) {
        break
      }
      count.characters += await this.deleteAssets(ids)
      count.assets += ids.length
    }
    count.characters += await this.deleteCharacters(
      this.isStale(
        "character",
        characterTable.id,
        characterTable.createdAt,
        cutoff
      )
    )
    count.runs += await this.deleteRuns(cutoff)
    await this.forgetSessions(cutoff)
    await RouterCatalog.forgetUnread(this.db, cutoff)
    return count
  }

  private async deleteAssets(ids: readonly string[]): Promise<number> {
    const characters = await this.deleteCharacters(
      or(...ids.map((id) => referencing(id)))
    )
    await Promise.all(
      ids.map((id) => this.store.delete(assetIdFormat.parse(id)))
    )
    await this.db.delete(assetTable).where(inArray(assetTable.id, [...ids]))
    await this.forget("asset", ids)
    return characters
  }

  private async forgetSessions(cutoff: number): Promise<void> {
    await this.db.delete(sessionRecordTable).where(
      and(
        lt(sessionRecordTable.createdAt, cutoff),
        notExists(
          this.db
            .select({ one: sql`1` })
            .from(sessionVisitTable)
            .where(
              and(
                eq(sessionVisitTable.sessionId, sessionRecordTable.sessionId),
                gte(sessionVisitTable.visitedAt, cutoff)
              )
            )
        )
      )
    )
    await this.db
      .delete(sessionVisitTable)
      .where(lt(sessionVisitTable.visitedAt, cutoff))
    await this.db
      .delete(sessionLimitTable)
      .where(
        lt(
          sessionLimitTable.windowStart,
          this.clock.now().getTime() - SessionPurge.dayMs
        )
      )
  }

  private isStale(
    kind: SessionRecordKind,
    id: SQLiteColumn,
    createdAt: SQLiteColumn,
    cutoff: number
  ): SQL | undefined {
    const visited = this.db
      .select({ one: sql`1` })
      .from(sessionRecordTable)
      .innerJoin(
        sessionVisitTable,
        eq(sessionVisitTable.sessionId, sessionRecordTable.sessionId)
      )
      .where(
        and(
          eq(sessionRecordTable.kind, kind),
          eq(sessionRecordTable.recordId, id),
          gte(sessionVisitTable.visitedAt, cutoff)
        )
      )
    return and(lt(createdAt, cutoff), notExists(visited))
  }

  private async idsOf(
    table: SQLiteTable,
    id: SQLiteColumn,
    condition: SQL | undefined
  ): Promise<string[]> {
    const rows = await this.db
      .select({ id: sql<string>`${id}` })
      .from(table)
      .where(condition)
      .limit(SessionPurge.batch)
    return rows.map((row) => row.id)
  }

  private async deleteCharacters(condition: SQL | undefined): Promise<number> {
    let deleted = 0
    for (;;) {
      const ids = await this.idsOf(characterTable, characterTable.id, condition)
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
    const condition = this.isStale(
      "run",
      runTable.id,
      runTable.createdAt,
      cutoff
    )
    for (;;) {
      const ids = await this.idsOf(runTable, runTable.id, condition)
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
