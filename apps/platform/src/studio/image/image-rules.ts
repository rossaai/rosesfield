import {
  type AppListing,
  boundedInputOf,
  type InputDefinition,
  type InputRule,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FieldValue } from "@/screens/app/app-form"

type Inputs = Readonly<Record<string, FieldValue>>

function rulesByName(app: AppListing, inputs: Inputs): Map<string, InputRule> {
  return new Map(
    inputRulesOf(app, inputs).map((rule) => [rule.input.name, rule])
  )
}

export function shownInputOf(
  app: AppListing,
  inputs: Inputs,
  input: InputDefinition
): InputDefinition | null {
  const rule = rulesByName(app, inputs).get(input.name)
  if (rule === undefined) {
    return null
  }
  if (input.type === "choice" && (rule.allowed?.length ?? 0) < 2) {
    return null
  }
  return input.type === "choice" ? boundedInputOf(rule) : input
}

export function correctionsOf(
  app: AppListing,
  inputs: Inputs
): Record<string, string> {
  const fixes: Record<string, string> = {}
  for (const rule of rulesByName(app, inputs).values()) {
    const value = inputs[rule.input.name]
    if (
      rule.allowed !== null &&
      typeof value === "string" &&
      !rule.allowed.includes(value) &&
      typeof rule.fallback === "string"
    ) {
      fixes[rule.input.name] = rule.fallback
    }
  }
  return fixes
}
