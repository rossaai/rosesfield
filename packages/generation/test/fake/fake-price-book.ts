import type { Cost } from "@rosesfield/contract"
import type { KeptRun } from "#domain/kept-settings"
import { type MeasuredPrice, PriceBook } from "#domain/price-book.port"
import type { PricedRun } from "#domain/priced-run"

export class FakePriceBook extends PriceBook {
  readonly kept: MeasuredPrice[] = []

  override async find(run: PricedRun): Promise<Cost | null> {
    const found = this.kept.findLast(
      (one) => one.model === run.model && one.settings === run.settings
    )
    return found?.cost ?? null
  }

  override async runsOf(model: string): Promise<readonly KeptRun<Cost>[]> {
    const latest = new Map<string, Cost>()
    for (const one of this.kept) {
      if (one.model === model) {
        latest.set(one.settings, one.cost)
      }
    }
    return [...latest].map(([settings, cost]) => ({ settings, cost }))
  }

  override async keep(price: MeasuredPrice): Promise<void> {
    this.kept.push(price)
  }
}
