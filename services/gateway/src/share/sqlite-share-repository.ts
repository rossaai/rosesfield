import { and, desc, eq, gt, isNull, lt, or } from "drizzle-orm"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import { shareTable } from "#share/share-tables"

export type ShareRecord = typeof shareTable.$inferSelect

export class SqliteShareRepository {
  static readonly listLimit = 60

  private readonly db: SqliteDatabase

  constructor(options: { db: SqliteDatabase }) {
    this.db = options.db
  }

  async add(record: ShareRecord): Promise<void> {
    await this.db.insert(shareTable).values(record)
  }

  async get(id: string, now: number): Promise<ShareRecord | null> {
    const rows = await this.db
      .select()
      .from(shareTable)
      .where(and(eq(shareTable.id, id), this.isLive(now)))
    return rows[0] ?? null
  }

  async ofRun(
    runId: string,
    sessionId: string | null,
    now: number
  ): Promise<ShareRecord | null> {
    const rows = await this.db
      .select()
      .from(shareTable)
      .where(
        and(
          eq(shareTable.runId, runId),
          sessionId === null
            ? isNull(shareTable.sessionId)
            : eq(shareTable.sessionId, sessionId),
          this.isLive(now)
        )
      )
      .limit(1)
    return rows[0] ?? null
  }

  async listed(now: number): Promise<ShareRecord[]> {
    return this.db
      .select()
      .from(shareTable)
      .where(and(eq(shareTable.placement, "explore"), this.isLive(now)))
      .orderBy(desc(shareTable.createdAt))
      .limit(SqliteShareRepository.listLimit)
  }

  async expired(now: number, limit: number): Promise<ShareRecord[]> {
    return this.db
      .select()
      .from(shareTable)
      .where(lt(shareTable.expiresAt, now))
      .limit(limit)
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(shareTable).where(eq(shareTable.id, id))
  }

  private isLive(now: number) {
    return or(isNull(shareTable.expiresAt), gt(shareTable.expiresAt, now))
  }
}
