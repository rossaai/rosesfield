import { and, eq, exists, type SQL, sql } from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import {
  type SessionRecordKind,
  sessionRecordTable,
} from "#session/session-tables"

export type SessionId = string

type SessionScopeOptions = {
  db: SqliteDatabase
  sessionId: SessionId
}

export class SessionScope {
  readonly sessionId: SessionId
  private readonly db: SqliteDatabase

  constructor(options: SessionScopeOptions) {
    this.db = options.db
    this.sessionId = options.sessionId
  }

  owns(kind: SessionRecordKind, id: SQLiteColumn): SQL {
    return exists(
      this.db
        .select({ one: sql`1` })
        .from(sessionRecordTable)
        .where(
          and(
            eq(sessionRecordTable.kind, kind),
            eq(sessionRecordTable.recordId, id),
            eq(sessionRecordTable.sessionId, this.sessionId)
          )
        )
    )
  }

  async claim(
    kind: SessionRecordKind,
    recordId: string,
    createdAt: number
  ): Promise<void> {
    await this.db
      .insert(sessionRecordTable)
      .values({ kind, recordId, sessionId: this.sessionId, createdAt })
  }
}
