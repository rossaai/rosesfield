import { CreditMeter } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import type { Handlers } from "#build-handlers"
import type { SpendSettings } from "#env"
import type { SqliteDatabase } from "#infrastructure/sqlite-database"
import { SpendCap } from "#spend/spend-cap"
import { SpendGuard } from "#spend/spend-guard"

export type OwnerSpend = {
  cap: SpendCap
  guard: SpendGuard
}

export function ownerSpend(options: {
  settings: SpendSettings | undefined
  db: SqliteDatabase
  clock: Clock
  handlers: Handlers
}): OwnerSpend | null {
  const { settings, handlers } = options
  if (settings === undefined) {
    return null
  }
  const cap = new SpendCap({
    db: options.db,
    clock: options.clock,
    capCredits: settings.capCredits,
    unknownRunCredits: settings.unknownRunCredits,
    creditsOfCost: (usd) => usd * CreditMeter.creditsPerUsd,
  })
  const guard = new SpendGuard({
    cap,
    pricer: {
      price: async (request) =>
        (await handlers.priceRun.execute(request)).price,
      runOf: async (runId) => (await handlers.getRun.execute({ runId })).run,
    },
  })
  return { cap, guard }
}
