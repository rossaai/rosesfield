import type { z } from "zod"
import type { InputDefinition } from "#input.contract"
import type { InputWhen } from "#input-condition.contract"
import {
  describeWhen,
  type InputRule,
  inputRulesOf,
  isRuledInput,
} from "#input-rule.contract"

type Inputs = Readonly<Record<string, unknown>>

type Check = {
  value: unknown
  problem: string | null
}

function whenOf(input: InputDefinition): InputWhen | null {
  return input.type === "seed" ? null : (input.when ?? null)
}

function isEmpty(input: InputDefinition, value: unknown): boolean {
  if (input.type === "prompt") {
    return typeof value !== "string" || !/\S/.test(value)
  }
  return !Array.isArray(value) || value.length === 0
}

function presenceProblem(
  input: InputDefinition,
  value: unknown
): string | null {
  if (!("presence" in input) || input.presence !== "required") {
    return null
  }
  if (!isEmpty(input, value)) {
    return null
  }
  const when = whenOf(input)
  return when === null
    ? `${input.name} is required`
    : `${input.name} is required when ${describeWhen(when)}`
}

function boundProblem(rule: InputRule, value: unknown): string | null {
  const { allowed, range, input } = rule
  if (allowed !== null && allowed.length === 0) {
    return `No value of ${input.name} fits the other inputs`
  }
  if (allowed !== null && typeof value === "string") {
    return allowed.includes(value)
      ? null
      : `${input.name} takes ${allowed.join(", ")} with these inputs`
  }
  if (range !== null && range.min > range.max) {
    return `No value of ${input.name} fits the other inputs`
  }
  if (range !== null && typeof value === "number") {
    const takes =
      range.min === range.max ? `${range.min}` : `${range.min} to ${range.max}`
    return value >= range.min && value <= range.max
      ? null
      : `${input.name} takes ${takes} with these inputs`
  }
  return null
}

const listTypes: readonly string[] = ["image", "video", "audio", "character"]

function filledValue(rule: InputRule, given: unknown): unknown {
  if (given !== undefined) {
    return given
  }
  if (rule.fallback !== null) {
    return rule.fallback
  }
  return listTypes.includes(rule.input.type) ? [] : undefined
}

function isGiven(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return typeof value === "string" ? /\S/.test(value) : value !== undefined
}

function checkRule(rule: InputRule, given: unknown): Check {
  const { input } = rule
  const filled = filledValue(rule, given)
  return {
    value: filled,
    problem: presenceProblem(input, filled) ?? boundProblem(rule, filled),
  }
}

function whenProblem(input: InputDefinition, given: unknown): string | null {
  const when = whenOf(input)
  return isGiven(given) && when !== null
    ? `${input.name} applies only when ${describeWhen(when)}`
    : null
}

export function givenRuleIssuesOf(
  app: { inputs: readonly InputDefinition[] },
  inputs: Inputs,
  names: ReadonlySet<string>
): string[] {
  const rules = new Map(
    inputRulesOf(app, inputs).map((rule) => [rule.input.name, rule])
  )
  return app.inputs.flatMap((input) => {
    const given = inputs[input.name]
    if (!names.has(input.name) || !isGiven(given)) {
      return []
    }
    const rule = rules.get(input.name)
    const problem =
      rule === undefined
        ? whenProblem(input, given)
        : isRuledInput(input)
          ? boundProblem(rule, given)
          : null
    return problem === null ? [] : [`${input.name}: ${problem}`]
  })
}

export function checkRuledInputs(
  app: { inputs: readonly InputDefinition[] },
  inputs: Inputs,
  context: z.RefinementCtx
): Record<string, unknown> | null {
  const rules = new Map(
    inputRulesOf(app, inputs).map((rule) => [rule.input.name, rule])
  )
  const checked: Record<string, unknown> = {}
  let isValid = true
  const refuse = (name: string, message: string): void => {
    isValid = false
    context.addIssue({ code: "custom", message, path: ["inputs", name] })
  }
  for (const input of app.inputs) {
    const given = inputs[input.name]
    const rule = rules.get(input.name)
    if (rule === undefined) {
      const problem = whenProblem(input, given)
      if (problem !== null) {
        refuse(input.name, problem)
      }
      continue
    }
    const check = isRuledInput(input)
      ? checkRule(rule, given)
      : { value: given, problem: null }
    if (check.problem !== null) {
      refuse(input.name, check.problem)
    }
    if (check.value !== undefined) {
      checked[input.name] = check.value
    }
  }
  return isValid ? checked : null
}
