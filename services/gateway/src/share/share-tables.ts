import type { Run } from "@rosesfield/contract"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export type SharePlacement = "link" | "explore"

export type SharedPoster = {
  key: string
  mime: string
}

export type SharedMedia = {
  key: string
  kind: "image" | "video" | "audio"
  mime: string
  width: number | null
  height: number | null
  durationSeconds: number | null
  poster?: SharedPoster
}

export const shareTable = sqliteTable(
  "shares",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    sessionId: text("session_id"),
    run: text("run", { mode: "json" }).$type<Run>().notNull(),
    media: text("media", { mode: "json" }).$type<SharedMedia[]>().notNull(),
    placement: text("placement").$type<SharePlacement>().notNull(),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at"),
  },
  (table) => [
    index("shares_run_id").on(table.runId),
    index("shares_placement_created_at").on(table.placement, table.createdAt),
    index("shares_expires_at").on(table.expiresAt),
  ]
)
