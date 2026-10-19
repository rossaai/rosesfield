import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FieldProblem, FormValues } from "@/screens/app/app-form"

export type VoiceMode = "model" | "recording"

export const modeInput = "mode"
export const recordingInput = "recording"
export const shortestRecordingSeconds = 6
export const longestRecordingSeconds = 30

const modes: readonly VoiceMode[] = ["model", "recording"]

function isVoiceMode(value: unknown): value is VoiceMode {
  return modes.some((mode) => mode === value)
}

export function modeOf(values: FormValues): VoiceMode {
  const value = values.inputs[modeInput]
  return isVoiceMode(value) ? value : "model"
}

function appliedIn(app: AppListing, mode: VoiceMode): ReadonlySet<string> {
  return new Set(
    inputRulesOf(app, { [modeInput]: mode }).map((rule) => rule.input.name)
  )
}

function optional(input: InputDefinition): InputDefinition {
  return "presence" in input ? { ...input, presence: "optional" } : input
}

export function formAppFor(app: AppListing, mode: VoiceMode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.map((input) =>
      applied.has(input.name) ? input : optional(input)
    ),
  }
}

export function bodyAppFor(app: AppListing, mode: VoiceMode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}

export function panelInputsOf(
  app: AppListing,
  mode: VoiceMode
): InputDefinition[] {
  return bodyAppFor(app, mode).inputs.filter((input) => input.type !== "seed")
}

function tenths(seconds: number): number {
  return Math.round(seconds * 10) / 10
}

export function recordingLengthProblem(seconds: number): FieldProblem | null {
  if (seconds < shortestRecordingSeconds) {
    return {
      name: recordingInput,
      key: "field.asset.tooShort",
      values: { seconds: tenths(seconds), min: shortestRecordingSeconds },
    }
  }
  if (seconds > longestRecordingSeconds) {
    return {
      name: recordingInput,
      key: "field.asset.tooLong",
      values: { seconds: tenths(seconds), max: longestRecordingSeconds },
    }
  }
  return null
}
