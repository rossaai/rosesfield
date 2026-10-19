import { runTable } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import { eq } from "drizzle-orm"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import { SpendCapUnreadableError } from "#spend/spend-cap-unreadable.error"
import { spendHoldTable } from "#spend/spend-tables"

export type CapStatus = {
  credits: number
  left: number
}

type SpendCapOptions = {
  db: SqliteDatabase
  clock: Clock
  capCredits: number
  unknownRunCredits: number
  creditsOfCost: (usd: number) => number
}

type RunRow = {
  id: string
  count: number
  origin: string
  costAmount: number | null
}

export class SpendCap {
  readonly capCredits: number
  readonly unknownRunCredits: number

  private readonly db: SqliteDatabase
  private readonly clock: Clock
  private readonly creditsOfCost: (usd: number) => number

  constructor(options: SpendCapOptions) {
    this.db = options.db
    this.clock = options.clock
    this.capCredits = options.capCredits
    this.unknownRunCredits = options.unknownRunCredits
    this.creditsOfCost = options.creditsOfCost
  }

  async read(): Promise<CapStatus> {
    const spent = await this.spent()
    const left = Math.max(0, this.capCredits - spent)
    return { credits: this.capCredits, left: Math.round(left * 100) / 100 }
  }

  async hold(runId: string, credits: number): Promise<void> {
    await this.db
      .insert(spendHoldTable)
      .values({ runId, credits, createdAt: this.clock.now().getTime() })
      .onConflictDoNothing()
  }

  private async spent(): Promise<number> {
    try {
      const [runs, holds] = await Promise.all([
        this.db
          .select({
            id: runTable.id,
            count: runTable.count,
            origin: runTable.origin,
            costAmount: runTable.costAmount,
          })
          .from(runTable)
          .where(eq(runTable.origin, "live")),
        this.db
          .select({
            runId: spendHoldTable.runId,
            credits: spendHoldTable.credits,
          })
          .from(spendHoldTable),
      ])
      const held = new Map(holds.map((one) => [one.runId, one.credits]))
      return runs.reduce((sum, run) => sum + this.creditsOfRun(run, held), 0)
    } catch (error) {
      throw new SpendCapUnreadableError({ cause: error })
    }
  }

  private creditsOfRun(run: RunRow, held: ReadonlyMap<string, number>): number {
    if (run.costAmount !== null) {
      return this.creditsOfCost(run.costAmount)
    }
    return held.get(run.id) ?? this.unknownRunCredits * run.count
  }
}
