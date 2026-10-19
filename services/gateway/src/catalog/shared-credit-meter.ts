import { CreditMeter } from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"

let shared: CreditMeter | null = null

export function sharedCreditMeter(clock: Clock): CreditMeter {
  shared ??= new CreditMeter({ clock })
  return shared
}
