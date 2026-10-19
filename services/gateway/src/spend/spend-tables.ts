import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const spendHoldTable = sqliteTable("spend_holds", {
  runId: text("run_id").primaryKey(),
  credits: real("credits").notNull(),
  createdAt: integer("created_at").notNull(),
})
