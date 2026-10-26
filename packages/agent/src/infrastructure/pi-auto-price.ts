import type { PriceFrom, RunPrice } from "@rosesfield/generation"

/** The sources whose price is Rosesfield's own guess from other runs, which can sit below what Comfy bills. */
const guessedFrom: readonly PriceFrom[] = ["model-runs", "task-runs"]

/** The credits Auto may start a run on: the upper end of a price Comfy publishes or measured, else null. */
export function autoCreditsOf(price: RunPrice): number | null {
  if (price.credits === null) {
    return null
  }
  return price.from !== undefined && guessedFrom.includes(price.from)
    ? null
    : price.credits
}
