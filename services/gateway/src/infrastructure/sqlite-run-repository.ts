import {
  fromRunRow,
  Run,
  RunConflictError,
  type RunCursor,
  type RunPage,
  RunRepository,
  type RunRow,
  runTable,
  toRunRow,
} from "@rosesfield/generation"
import type { RunId } from "@rosesfield/kernel"
import { and, asc, desc, eq, lt, notInArray, or, type SQL } from "drizzle-orm"
import {
  isConstraintError,
  type SqliteDatabase,
} from "#infrastructure/sqlite-database"
import type { SessionScope } from "#session/session-scope"

type SqliteRunRepositoryOptions = {
  db: SqliteDatabase
  scope: SessionScope | null
}

export class SqliteRunRepository extends RunRepository {
  private readonly db: SqliteDatabase
  private readonly scope: SessionScope | null

  constructor(options: SqliteRunRepositoryOptions) {
    super()
    this.db = options.db
    this.scope = options.scope
  }

  override async add(run: Run): Promise<Run> {
    const stored = run.withVersion(1)
    const row = toRunRow(stored)
    try {
      await this.scope?.claim("run", row.id, row.createdAt)
      await this.db.insert(runTable).values(row)
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
      .where(
        this.within(eq(runTable.id, run.id), eq(runTable.version, run.version))
      )
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
      .where(this.within(eq(runTable.id, id)))
    return firstRun(rows)
  }

  override async findByIdempotencyKey(key: string): Promise<Run | null> {
    const rows = await this.db
      .select()
      .from(runTable)
      .where(this.within(eq(runTable.idempotencyKey, key)))
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
      .where(this.within(...conditions))
      .orderBy(desc(runTable.createdAt), desc(runTable.id))
      .limit(page.limit)
    return rows.map(fromRunRow)
  }

  override async listUnfinished(): Promise<Run[]> {
    const rows = await this.db
      .select()
      .from(runTable)
      .where(
        this.within(notInArray(runTable.status, [...Run.finishedStatuses]))
      )
      .orderBy(asc(runTable.createdAt), asc(runTable.id))
    return rows.map(fromRunRow)
  }

  private within(...conditions: SQL[]): SQL | undefined {
    const owned = this.scope?.owns("run", runTable.id)
    return and(...conditions, ...(owned === undefined ? [] : [owned]))
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
