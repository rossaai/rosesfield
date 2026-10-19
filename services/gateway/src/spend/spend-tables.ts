import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const spendStartTable = sqliteTable("spend_start", {
  id: text("id").primaryKey(),
  credits: real("credits").notNull(),
  startedAt: integer("started_at").notNull(),
})
