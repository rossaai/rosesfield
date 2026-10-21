import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FieldProblem } from "@/screens/app/app-form"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import { modeInput, voiceCloneTab } from "@/studio/audio/audio-tabs"

export const shortestCloneSeconds = 6
export const longestCloneSeconds = 30

function appliedIn(app: AppListing, tab: string): ReadonlySet<string> {
  return new Set(
    inputRulesOf(app, { [modeInput]: tab }).map((rule) => rule.input.name)
  )
}

function optional(input: InputDefinition): InputDefinition {
  return "presence" in input ? { ...input, presence: "optional" } : input
}

export function formAppFor(app: AppListing, tab: string): AppListing {
  const applied = appliedIn(app, tab)
  return {
    ...app,
    inputs: app.inputs.map((input) =>
      applied.has(input.name) ? input : optional(input)
    ),
  }
}

export function bodyAppFor(app: AppListing, tab: string): AppListing {
  const applied = appliedIn(app, tab)
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
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
