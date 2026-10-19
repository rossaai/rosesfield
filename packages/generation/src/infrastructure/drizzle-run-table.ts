import { sql } from "drizzle-orm"
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

export const runTable = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    appId: text("app_id").notNull(),
    status: text("status").notNull(),
    inputs: text("inputs", { mode: "json" }).notNull(),
    count: integer("count").notNull(),
    aspectRatio: text("aspect_ratio"),
    seed: integer("seed"),
    outputs: text("outputs", { mode: "json" }).notNull(),
    progress: real("progress"),
    engineAdapter: text("engine_adapter").notNull(),
    engineModels: text("engine_models", { mode: "json" }).notNull(),
    workflowHash: text("workflow_hash"),
    jobs: text("jobs", { mode: "json" }).notNull().default(sql`'[]'`),
    costAmount: real("cost_amount"),
    origin: text("origin").notNull(),
    failureCode: text("failure_code"),
    failureStatus: integer("failure_status"),
    idempotencyKey: text("idempotency_key").unique(),
    attempts: integer("attempts").notNull(),
    version: integer("version").notNull(),
    createdAt: integer("created_at").notNull(),
    finishedAt: integer("finished_at"),
  },
  (table) => [
    index("runs_created_at_id").on(table.createdAt, table.id),
    index("runs_app_id_created_at").on(table.appId, table.createdAt),
    index("runs_status").on(table.status),
  ]
)
