import {
  type AppListing,
  type InputDefinition,
  type InputRule,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FieldValue } from "@/screens/app/app-form"

type Inputs = Readonly<Record<string, FieldValue>>

export type VideoRules = ReadonlyMap<string, InputRule>

export const modelName = "model"
export const clipName = "clip"
export const startFrameName = "startFrame"
export const lengthName = "length"

const settable: readonly string[] = ["choice", "number", "toggle"]

export function rulesOf(app: AppListing, inputs: Inputs): VideoRules {
  return new Map(
    inputRulesOf(app, inputs).map((rule) => [rule.input.name, rule])
  )
}

export function shownInput(
  input: InputDefinition,
  rules: VideoRules
): InputDefinition | null {
  const rule = rules.get(input.name)
  if (rule === undefined) {
    return null
  }
  const { allowed, range } = rule
  if (input.type === "choice" && allowed !== null) {
    const options = input.options.filter((option) =>
      allowed.includes(option.value)
    )
    return options.length < 2 ? null : { ...input, options }
  }
  if (input.type === "toggle" && allowed !== null) {
    return allowed.length < 2 ? null : input
  }
  if (input.type === "number" && range !== null) {
    return range.min < range.max
      ? { ...input, min: range.min, max: range.max }
      : null
  }
  return input
}

function fixOf(rule: InputRule, value: FieldValue): FieldValue | null {
  const { allowed, range, fallback } = rule
  const next = fallback ?? undefined
  if (value === undefined) {
    return next === undefined ? null : next
  }
  if (allowed !== null && !allowed.includes(String(value))) {
    return next
  }
  if (
    range !== null &&
    typeof value === "number" &&
    (value < range.min || value > range.max)
  ) {
    return next
  }
  return null
}

export function ruleFixes(
  app: AppListing,
  inputs: Inputs
): Record<string, FieldValue> {
  const rules = rulesOf(app, inputs)
  const fixes: Record<string, FieldValue> = {}
  for (const input of app.inputs) {
    if (!settable.includes(input.type)) {
      continue
    }
    const value = inputs[input.name]
    const rule = rules.get(input.name)
    if (rule === undefined) {
      if (value !== undefined) {
        fixes[input.name] = undefined
      }
      continue
    }
    const fix = fixOf(rule, value)
    if (fix !== null) {
      fixes[input.name] = fix
    }
  }
  return fixes
}
