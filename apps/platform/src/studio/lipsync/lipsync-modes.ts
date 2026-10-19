import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
} from "@rosesfield/contract"
import type { FormValues } from "@/screens/app/app-form"

export type LipsyncMode = "photo" | "clip"

export const modeInput = "mode"
export const photoInput = "photo"
export const clipInput = "clip"
export const audioInput = "audio"
export const lengthInput = "length"

const modes: readonly LipsyncMode[] = ["photo", "clip"]

const derivedInputs: readonly string[] = [lengthInput]

function isLipsyncMode(value: unknown): value is LipsyncMode {
  return modes.some((mode) => mode === value)
}

export function modeOf(values: FormValues): LipsyncMode {
  const value = values.inputs[modeInput]
  return isLipsyncMode(value) ? value : "photo"
}

function appliedIn(app: AppListing, mode: LipsyncMode): ReadonlySet<string> {
  return new Set(
    inputRulesOf(app, { [modeInput]: mode }).map((rule) => rule.input.name)
  )
}

function optional(input: InputDefinition): InputDefinition {
  return "presence" in input ? { ...input, presence: "optional" } : input
}

export function formAppFor(app: AppListing, mode: LipsyncMode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.map((input) =>
      applied.has(input.name) ? input : optional(input)
    ),
  }
}

export function bodyAppFor(app: AppListing, mode: LipsyncMode): AppListing {
  const applied = appliedIn(app, mode)
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}

export function shownInputsOf(
  app: AppListing,
  mode: LipsyncMode
): InputDefinition[] {
  return bodyAppFor(app, mode).inputs.filter(
    (input) => input.type !== "seed" && !derivedInputs.includes(input.name)
  )
}
