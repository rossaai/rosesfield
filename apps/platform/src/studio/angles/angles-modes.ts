import { type AppListing, inputRulesOf } from "@rosesfield/contract"
import type { Mode } from "../../../../../packages/catalog/src/angles/angle-views"

export const modeInput = "mode"

function appliedIn(app: AppListing, mode: Mode): ReadonlySet<string> {
  return new Set(
    inputRulesOf(app, { [modeInput]: mode }).map((rule) => rule.input.name)
  )
}

export function isShownIn(app: AppListing, mode: Mode, name: string): boolean {
  return appliedIn(app, mode).has(name)
}

export function bodyAppFor(app: AppListing, mode: Mode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}
