import { fileURLToPath } from "node:url"
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url)
)

export function migrateRunTable(db: BunSQLiteDatabase): void {
  migrate(db, { migrationsFolder, migrationsTable: "__generation_migrations" })
}
