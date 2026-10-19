import type { Clock } from "@rosesfield/kernel"
import { sql } from "drizzle-orm"
import { SessionRateLimitedError } from "#error/session-rate-limited.error"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import type { SessionId } from "#session/session-scope"
import { sessionLimitTable } from "#session/session-tables"

type SessionLimiterOptions = {
  db: SqliteDatabase
  clock: Clock
  requestsPerMinute: number
}

export class SessionLimiter {
  static readonly windowMs = 60_000

  private readonly db: SqliteDatabase
  private readonly clock: Clock
  private readonly limit: number

  constructor(options: SessionLimiterOptions) {
    this.db = options.db
    this.clock = options.clock
    this.limit = options.requestsPerMinute
  }

  async take(sessionId: SessionId): Promise<void> {
    const now = this.clock.now().getTime()
    const windowStart = now - (now % SessionLimiter.windowMs)
    const rows = await this.db
      .insert(sessionLimitTable)
      .values({ sessionId, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: sessionLimitTable.sessionId,
        set: {
          count: sql`case when ${sessionLimitTable.windowStart} = ${windowStart} then ${sessionLimitTable.count} + 1 else 1 end`,
          windowStart,
        },
      })
      .returning({ count: sessionLimitTable.count })
    const count = rows[0]?.count ?? 0
    if (count > this.limit) {
      throw new SessionRateLimitedError({
        limit: this.limit,
        retryAfterSeconds: Math.ceil(
          (windowStart + SessionLimiter.windowMs - now) / 1000
        ),
      })
    }
  }
}
