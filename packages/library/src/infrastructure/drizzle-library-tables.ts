import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

export const assetTable = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: real("duration_seconds"),
    sourceRunId: text("source_run_id"),
    place: text("place").notNull().default("library"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("assets_created_at_id").on(table.createdAt, table.id),
    index("assets_kind_created_at").on(table.kind, table.createdAt),
    index("assets_source_run_id").on(table.sourceRunId),
  ]
)

export const characterTable = sqliteTable(
  "characters",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    references: text("references", { mode: "json" }).notNull(),
    notes: text("notes").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("characters_created_at").on(table.createdAt)]
)
