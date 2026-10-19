import type { InputDefinition } from "#input.contract"
import type { InputCondition, InputWhen } from "#input-condition.contract"

type Values = Readonly<Record<string, unknown>>
type Listed = Extract<InputDefinition, { type: "choice" | "toggle" }>

export type InputRule = {
  input: InputDefinition
  allowed: readonly string[] | null
  range: { min: number; max: number } | null
  fallback: string | number | null
}

const toggleValues: readonly string[] = ["on", "off"]

export function conditionHolds(
  condition: InputCondition,
  values: Values
): boolean {
  const value = values[condition.input]
  if ("is" in condition) {
    return typeof value === "string" && condition.is.includes(value)
  }
  const isFilled = Array.isArray(value) && value.length > 0
  return condition.state === (isFilled ? "filled" : "empty")
}

export function whenHolds(
  when: InputWhen | undefined,
  values: Values
): boolean {
  return (when ?? []).every((condition) => conditionHolds(condition, values))
}

export function describeWhen(when: InputWhen): string {
  return when
    .map((condition) =>
      "is" in condition
        ? `${condition.input} is ${condition.is.join(" or ")}`
        : `${condition.input} is ${condition.state}`
    )
    .join(" and ")
}

export function isRuledInput(input: InputDefinition): boolean {
  return (
    (input.type !== "seed" && input.when !== undefined) ||
    ("bounds" in input && input.bounds !== undefined)
  )
}

function allowedValues(input: Listed, values: Values): string[] {
  const all =
    input.type === "choice"
      ? input.options.map((option) => option.value)
      : [...toggleValues]
  const bounds = (input.bounds ?? []).filter((bound) =>
    whenHolds(bound.when, values)
  )
  return all.filter((value) =>
    bounds.every((bound) => bound.values.some((one) => one === value))
  )
}

function allowedRange(
  input: Extract<InputDefinition, { type: "number" }>,
  values: Values
): { min: number; max: number } {
  return (input.bounds ?? [])
    .filter((bound) => whenHolds(bound.when, values))
    .reduce(
      (range, bound) => ({
        min: Math.max(range.min, bound.min),
        max: Math.min(range.max, bound.max),
      }),
      { min: input.min, max: input.max }
    )
}

function ruleOf(input: InputDefinition, values: Values): InputRule {
  if (input.type === "number") {
    const range = allowedRange(input, values)
    const fallback =
      range.min > range.max
        ? null
        : Math.min(range.max, Math.max(range.min, input.default))
    return { input, allowed: null, range, fallback }
  }
  if (input.type === "choice" || input.type === "toggle") {
    const allowed = allowedValues(input, values)
    const fallback = allowed.includes(input.default)
      ? input.default
      : (allowed[0] ?? null)
    return { input, allowed, range: null, fallback }
  }
  return { input, allowed: null, range: null, fallback: null }
}

export function inputRulesOf(
  app: { inputs: readonly InputDefinition[] },
  given: Values
): InputRule[] {
  const present: Record<string, unknown> = { ...given }
  const rules: InputRule[] = []
  for (const input of app.inputs) {
    const when = input.type === "seed" ? undefined : input.when
    if (!whenHolds(when, present)) {
      delete present[input.name]
      continue
    }
    const rule = ruleOf(input, present)
    if (present[input.name] === undefined && rule.fallback !== null) {
      present[input.name] = rule.fallback
    }
    rules.push(rule)
  }
  return rules
}
