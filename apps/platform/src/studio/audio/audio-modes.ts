import {
  type AppListing,
  type InputDefinition,
  type InputRule,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FieldProblem } from "@/screens/app/app-form"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import { modeInput, voiceCloneTab } from "@/studio/audio/audio-tabs"

export const shortestCloneSeconds = 6
export const longestCloneSeconds = 30

function boundedOf(input: InputDefinition, rule: InputRule): InputDefinition {
  if (input.type === "number" && rule.range !== null) {
    const { min, max } = rule.range
    return {
      ...input,
      min,
      max,
      default: Math.min(max, Math.max(min, input.default)),
    }
  }
  const allowed = rule.allowed
  if (input.type === "choice" && allowed !== null && allowed.length > 0) {
    return {
      ...input,
      options: input.options.filter((one) => allowed.includes(one.value)),
      default: allowed.includes(input.default)
        ? input.default
        : (allowed[0] ?? input.default),
    }
  }
  return input
}

function rulesIn(
  app: AppListing,
  tab: string
): ReadonlyMap<string, InputRule> {
  return new Map(
    inputRulesOf(app, { [modeInput]: tab }).map((rule) => [
      rule.input.name,
      rule,
    ])
  )
}

function optional(input: InputDefinition): InputDefinition {
  return "presence" in input ? { ...input, presence: "optional" } : input
}

export function formAppFor(app: AppListing, tab: string): AppListing {
  const rules = rulesIn(app, tab)
  return {
    ...app,
    inputs: app.inputs.map((input) => {
      const rule = rules.get(input.name)
      return rule === undefined ? optional(input) : boundedOf(input, rule)
    }),
  }
}

export function bodyAppFor(app: AppListing, tab: string): AppListing {
  const rules = rulesIn(app, tab)
  return {
    ...app,
    inputs: app.inputs.flatMap((input) => {
      const rule = rules.get(input.name)
      return rule === undefined ? [] : [boundedOf(input, rule)]
    }),
  }
}

export function panelInputsOf(app: AppListing, tab: string): InputDefinition[] {
  return bodyAppFor(app, tab).inputs.filter(
    (input) =>
      input.type !== "seed" &&
      input.name !== modeInput &&
      input.name !== modelInputName
  )
}

export function recordingOf(app: AppListing, tab: string): string | null {
  return (
    bodyAppFor(app, tab).inputs.find((input) => input.type === "audio")
      ?.name ?? null
  )
}

function tenths(seconds: number): number {
  return Math.round(seconds * 10) / 10
}

export function recordingLengthProblem(
  tab: string,
  name: string,
  seconds: number
): FieldProblem | null {
  if (tab !== voiceCloneTab) {
    return null
  }
  if (seconds < shortestCloneSeconds) {
    return {
      name,
      key: "field.asset.tooShort",
      values: { seconds: tenths(seconds), min: shortestCloneSeconds },
    }
  }
  if (seconds > longestCloneSeconds) {
    return {
      name,
      key: "field.asset.tooLong",
      values: { seconds: tenths(seconds), max: longestCloneSeconds },
    }
  }
  return null
}
