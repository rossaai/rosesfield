import type { AppDefinition, Cost } from "@rosesfield/contract"
import type { GenerationEngine } from "#domain/generation-engine.port"
import type { PriceBook } from "#domain/price-book.port"
import { pricedRunOf } from "#domain/priced-run"
import type { Run } from "#domain/run"
import { resolveBinding } from "#domain/select-binding"

export type PriceRecord = {
  run: Run
  app: AppDefinition
  engine: GenerationEngine
  cost: Cost | null
  now: Date
}

export async function recordPrice(
  prices: PriceBook | null,
  record: PriceRecord
): Promise<void> {
  const { run, app, engine, cost } = record
  if (prices === null || cost === null || run.jobs.length !== 1) {
    return
  }
  const { inputs, count, aspectRatio } = run.toRecord()
  const form = await engine.formOf(resolveBinding(app.engine, inputs))
  await prices.keep({
    ...pricedRunOf({ app, inputs, form, count, aspectRatio }),
    cost,
    measuredAt: record.now,
  })
}
