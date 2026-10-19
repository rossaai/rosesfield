import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

export type SessionRecordKind = "run" | "asset" | "character"

export const sessionRecordTable = sqliteTable(
  "session_records",
  {
    kind: text("kind").$type<SessionRecordKind>().notNull(),
    recordId: text("record_id").notNull(),
    sessionId: text("session_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.kind, table.recordId] }),
    index("session_records_session_kind").on(table.sessionId, table.kind),
    index("session_records_created_at").on(table.createdAt),
  ]
)

export const sessionLimitTable = sqliteTable("session_limits", {
  sessionId: text("session_id").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
})
