import type { Cost } from "@rosesfield/contract"
import type { KeptRun } from "#domain/kept-settings"
import type { PricedRun } from "#domain/priced-run"

export type MeasuredPrice = PricedRun & {
  cost: Cost
  measuredAt: Date
}

export abstract class PriceBook {
  /** Returns the last measured cost of a run of this model at these settings, or null. */
  abstract find(run: PricedRun): Promise<Cost | null>

  /** Keeps the measured cost of one run, replacing the one held for the same model and settings. */
  abstract keep(price: MeasuredPrice): Promise<void>

  /** Returns every measured cost of a model, one per settings it ran at. */
  runsOf(_model: string): Promise<readonly KeptRun<Cost>[]> {
    return Promise.resolve([])
  }
}
