import {
  type AppListing,
  boundedInputOf,
  type InputDefinition,
  type InputRule,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FieldProblem } from "@/screens/app/app-form"
import { modeInput, voiceCloneTab } from "@/studio/audio/audio-tabs"

export const shortestCloneSeconds = 6
export const longestCloneSeconds = 30

function rulesIn(app: AppListing, tab: string): ReadonlyMap<string, InputRule> {
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
      return rule === undefined ? optional(input) : boundedInputOf(rule)
    }),
  }
}

export function bodyAppFor(app: AppListing, tab: string): AppListing {
  const rules = rulesIn(app, tab)
  return {
    ...app,
    inputs: app.inputs.flatMap((input) => {
      const rule = rules.get(input.name)
      return rule === undefined ? [] : [boundedInputOf(rule)]
    }),
  }
}

export function recordingOf(app: AppListing, tab: string): string | null {
  return (
    bodyAppFor(app, tab).inputs.find((input) => input.type === "audio")?.name ??
    null
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
