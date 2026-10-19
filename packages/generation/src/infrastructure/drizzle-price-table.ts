import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

export const priceTable = sqliteTable(
  "measured_prices",
  {
    model: text("model").notNull(),
    settings: text("settings").notNull(),
    costAmount: real("cost_amount").notNull(),
    measuredAt: integer("measured_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.model, table.settings] })]
)
