import type { RunId } from "@rosesfield/kernel"
import { and, asc, desc, eq, lt, notInArray, or, type SQL } from "drizzle-orm"
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite"
import { RunConflictError } from "#domain/error/run-conflict.error"
import { isRecord } from "#domain/is-record"
import { Run } from "#domain/run"
import {
  type RunCursor,
  type RunPage,
  RunRepository,
} from "#domain/run.repository"
import {
  fromRunRow,
  type RunRow,
  toRunRow,
} from "#infrastructure/drizzle-run-row"
import { runTable } from "#infrastructure/drizzle-run-table"

type DrizzleRunRepositoryOptions = {
  db: BunSQLiteDatabase
}

export class DrizzleRunRepository extends RunRepository {
  private readonly db: BunSQLiteDatabase

  constructor(options: DrizzleRunRepositoryOptions) {
    super()
    this.db = options.db
  }

  override async add(run: Run): Promise<Run> {
    const stored = run.withVersion(1)
    try {
      await this.db.insert(runTable).values(toRunRow(stored))
    } catch (error) {
      if (isConstraintError(error)) {
        throw new RunConflictError({ runId: run.id })
      }
      throw error
    }
    return stored
  }

  override async save(run: Run): Promise<Run> {
    const stored = run.withVersion(run.version + 1)
    const updated = await this.db
      .update(runTable)
      .set(toRunRow(stored))
      .where(and(eq(runTable.id, run.id), eq(runTable.version, run.version)))
      .returning({ id: runTable.id })
    if (updated.length === 0) {
      throw new RunConflictError({ runId: run.id })
    }
    return stored
  }

  override async get(id: RunId): Promise<Run | null> {
    const rows = await this.db
      .select()
      .from(runTable)
      .where(eq(runTable.id, id))
    return firstRun(rows)
  }

  override async findByIdempotencyKey(key: string): Promise<Run | null> {
    const rows = await this.db
      .select()
      .from(runTable)
      .where(eq(runTable.idempotencyKey, key))
    return firstRun(rows)
  }

  override async list(page: RunPage): Promise<Run[]> {
    const conditions: SQL[] = []
    if (page.appId !== null) {
      conditions.push(eq(runTable.appId, page.appId))
    }
    if (page.before !== null) {
      conditions.push(before(page.before))
    }
    const rows = await this.db
      .select()
      .from(runTable)
      .where(and(...conditions))
      .orderBy(desc(runTable.createdAt), desc(runTable.id))
      .limit(page.limit)
    return rows.map(fromRunRow)
  }

  override async listUnfinished(): Promise<Run[]> {
    const rows = await this.db
      .select()
      .from(runTable)
      .where(notInArray(runTable.status, [...Run.finishedStatuses]))
      .orderBy(asc(runTable.createdAt), asc(runTable.id))
    return rows.map(fromRunRow)
  }
}

function before(cursor: RunCursor): SQL {
  const time = cursor.createdAt.getTime()
  const condition = or(
    lt(runTable.createdAt, time),
    and(eq(runTable.createdAt, time), lt(runTable.id, cursor.id))
  )
  if (condition === undefined) {
    throw new TypeError("A cursor condition needs its two parts")
  }
  return condition
}

function firstRun(rows: RunRow[]): Run | null {
  const row = rows[0]
  return row === undefined ? null : fromRunRow(row)
}

function isConstraintError(error: unknown): boolean {
  for (let current = error; isRecord(current); current = current.cause) {
    if (
      typeof current.code === "string" &&
      current.code.startsWith("SQLITE_CONSTRAINT")
    ) {
      return true
    }
  }
  return false
}
