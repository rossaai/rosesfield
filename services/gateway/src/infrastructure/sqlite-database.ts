import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"

export type SqliteDatabase = BaseSQLiteDatabase<"sync" | "async", unknown>

const constraintPattern = /^D1_ERROR: [A-Z ]*constraint failed/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isConstraintError(error: unknown): boolean {
  for (let current = error; isRecord(current); current = current.cause) {
    const { code, message } = current
    if (typeof code === "string" && code.startsWith("SQLITE_CONSTRAINT")) {
      return true
    }
    if (typeof message === "string" && constraintPattern.test(message)) {
      return true
    }
  }
  return false
}
