import {
  type AppDefinition,
  inputRulesOf,
  isRuledInput,
} from "@rosesfield/contract"

export function ruledInputsOf<Value>(
  app: AppDefinition,
  given: Readonly<Record<string, Value>>
): Record<string, Value | string | number> {
  const filled: Record<string, Value | string | number> = { ...given }
  for (const rule of inputRulesOf(app, given)) {
    if (
      isRuledInput(rule.input) &&
      filled[rule.input.name] === undefined &&
      rule.fallback !== null
    ) {
      filled[rule.input.name] = rule.fallback
    }
  }
  return filled
}
