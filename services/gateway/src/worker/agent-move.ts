import { z } from "zod"

type Cell = string | number | null

const tableDump = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
})

type TableDump = z.infer<typeof tableDump>

export const agentDump = z.object({
  schema: z.array(z.string()),
  tables: z.array(tableDump),
})

export type AgentDump = z.infer<typeof agentDump>

type SchemaRow = {
  type: string
  name: string
  sql: string
}

const tablePrefix = "pi_"
const conversationTable = `${tablePrefix}conversations`
const namePattern = /^pi_[a-z0-9_]+$/

function isCell(value: SqlStorageValue): value is Cell {
  return (
    value === null || typeof value === "string" || typeof value === "number"
  )
}

function schemaOf(sql: SqlStorage): SchemaRow[] {
  return sql
    .exec<SchemaRow>(
      "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND tbl_name LIKE 'pi\\_%' ESCAPE '\\' ORDER BY type DESC, name"
    )
    .toArray()
    .filter((row) => namePattern.test(row.name))
}

export function conversationCount(sql: SqlStorage): number {
  const found = sql
    .exec<{ count: number }>(
      "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?",
      conversationTable
    )
    .one().count
  return found === 0
    ? 0
    : sql
        .exec<{ count: number }>(
          `SELECT count(*) AS count FROM ${conversationTable}`
        )
        .one().count
}

export function dumpAgent(sql: SqlStorage): AgentDump | null {
  const schema = schemaOf(sql)
  const tables: TableDump[] = []
  for (const row of schema.filter((one) => one.type === "table")) {
    const cursor = sql.exec(`SELECT * FROM ${row.name}`)
    const rows = [...cursor.raw()]
    if (!rows.every((cells) => cells.every(isCell))) {
      return null
    }
    tables.push({
      name: row.name,
      columns: cursor.columnNames,
      rows: rows.map((cells) => cells.filter(isCell)),
    })
  }
  return { schema: schema.map((row) => row.sql), tables }
}

function ifMissing(statement: string): string {
  return statement
    .replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ")
    .replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS ")
}

export function loadAgent(
  storage: DurableObjectStorage,
  dump: AgentDump
): void {
  storage.transactionSync(() => {
    for (const statement of dump.schema) {
      storage.sql.exec(ifMissing(statement))
    }
    for (const table of dump.tables) {
      if (!namePattern.test(table.name)) {
        throw new TypeError(`Refused a table outside the agent: ${table.name}`)
      }
      storage.sql.exec(`DELETE FROM ${table.name}`)
      const marks = table.columns.map(() => "?").join(", ")
      const columns = table.columns.map((column) => `"${column}"`).join(", ")
      for (const row of table.rows) {
        storage.sql.exec(
          `INSERT INTO ${table.name} (${columns}) VALUES (${marks})`,
          ...row
        )
      }
    }
  })
}
