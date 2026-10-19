import { EngineUnavailableError } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import type { MiddlewareHandler } from "hono"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import type { SpendCapStatus } from "#session/account.contract"
import { SpendCapReachedError } from "#spend/spend-cap-reached.error"
import { spendStartTable } from "#spend/spend-tables"

type SpendCapOptions = {
  db: SqliteDatabase
  clock: Clock
  capCredits: number
  creditsNow: () => Promise<number | null>
}

export class SpendCap {
  static readonly startId = "start"

  private readonly db: SqliteDatabase
  private readonly clock: Clock
  private readonly capCredits: number
  private readonly creditsNow: () => Promise<number | null>

  constructor(options: SpendCapOptions) {
    this.db = options.db
    this.clock = options.clock
    this.capCredits = options.capCredits
    this.creditsNow = options.creditsNow
  }

  async read(): Promise<SpendCapStatus | null> {
    const now = await this.creditsNow()
    if (now === null) {
      return null
    }
    const start = await this.startOf(now)
    const spent = Math.max(0, start - now)
    const left = Math.max(0, this.capCredits - spent)
    return {
      credits: this.capCredits,
      left: Math.round(left * 100) / 100,
    }
  }

  guard(): MiddlewareHandler {
    return async (c, next) => {
      if (c.req.method === "POST") {
        const status = await this.read()
        if (status === null) {
          throw new EngineUnavailableError({ cause: "no balance" })
        }
        if (status.left <= 0) {
          throw new SpendCapReachedError({ capCredits: this.capCredits })
        }
      }
      await next()
    }
  }

  private async startOf(now: number): Promise<number> {
    await this.db
      .insert(spendStartTable)
      .values({
        id: SpendCap.startId,
        credits: now,
        startedAt: this.clock.now().getTime(),
      })
      .onConflictDoNothing()
    const rows = await this.db
      .select({ credits: spendStartTable.credits })
      .from(spendStartTable)
    return rows[0]?.credits ?? now
  }
}
