import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FormValues } from "@/screens/app/app-form"

export type VideoEditMode = "extend" | "reframe" | "background" | "frame-rate"

export const modeInput = "mode"
export const sourceInput = "source"
export const aspectInput = "aspect"
export const seedInput = "seed"

const modes: readonly VideoEditMode[] = [
  "extend",
  "reframe",
  "background",
  "frame-rate",
]

const seededModes: readonly VideoEditMode[] = ["extend", "reframe"]

const advanced: readonly string[] = ["resolution", "seed"]

const formatRatios: Readonly<Record<string, string>> = {
  "1-1": "1:1",
  "4-3": "4:3",
  "3-4": "3:4",
  "16-9": "16:9",
  "9-16": "9:16",
}

function isVideoEditMode(value: unknown): value is VideoEditMode {
  return modes.some((mode) => mode === value)
}

function appliedIn(app: AppListing, mode: VideoEditMode): ReadonlySet<string> {
  return new Set(
    inputRulesOf(app, { [modeInput]: mode })
      .map((rule) => rule.input)
      .filter((input) => input.type !== "seed" || hasSeed(mode))
      .map((input) => input.name)
  )
}

export function modeOf(values: FormValues): VideoEditMode {
  const value = values.inputs[modeInput]
  return isVideoEditMode(value) ? value : "extend"
}

export function bodyAppFor(app: AppListing, mode: VideoEditMode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}

export function shownInputsOf(
  app: AppListing,
  mode: VideoEditMode
): InputDefinition[] {
  return bodyAppFor(app, mode).inputs.filter(
    (input) => !advanced.includes(input.name)
  )
}

export function advancedInputsOf(
  app: AppListing,
  mode: VideoEditMode
): InputDefinition[] {
  return bodyAppFor(app, mode).inputs.filter(
    (input) => advanced.includes(input.name) && input.type !== "seed"
  )
}

export function hasSeed(mode: VideoEditMode): boolean {
  return seededModes.includes(mode)
}

export function ratioOfFormat(format: unknown): string | null {
  return typeof format === "string" ? (formatRatios[format] ?? null) : null
}
