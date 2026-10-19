import type { Clock } from "@rosesfield/kernel"
import { eq, lt } from "drizzle-orm"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import type { SessionId } from "#session/session-scope"
import { sessionRecordTable, sessionVisitTable } from "#session/session-tables"

type SessionVisitsOptions = {
  db: SqliteDatabase
  clock: Clock
}

export class SessionVisits {
  static readonly everyMs = 3_600_000

  private readonly db: SqliteDatabase
  private readonly clock: Clock

  constructor(options: SessionVisitsOptions) {
    this.db = options.db
    this.clock = options.clock
  }

  async touch(sessionId: SessionId): Promise<boolean> {
    const now = this.clock.now().getTime()
    const rows = await this.db
      .insert(sessionVisitTable)
      .values({ sessionId, visitedAt: now })
      .onConflictDoUpdate({
        target: sessionVisitTable.sessionId,
        set: { visitedAt: now },
        setWhere: lt(sessionVisitTable.visitedAt, now - SessionVisits.everyMs),
      })
      .returning({ visitedAt: sessionVisitTable.visitedAt })
    return rows.length > 0
  }

  async move(from: SessionId, to: SessionId): Promise<void> {
    await this.db
      .update(sessionRecordTable)
      .set({ sessionId: to })
      .where(eq(sessionRecordTable.sessionId, from))
    await this.db
      .delete(sessionVisitTable)
      .where(eq(sessionVisitTable.sessionId, from))
  }
}
