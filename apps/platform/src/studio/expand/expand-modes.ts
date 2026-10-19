import { type AppListing, inputRulesOf } from "@rosesfield/contract"
import type { FieldValue } from "@/screens/app/app-form"
import {
  type ExpandMode,
  expandSides,
  ratioOfFormat,
} from "../../../../../packages/catalog/src/expand/comfy/expand-binding"

export type { ExpandMode }

export const modeInput = "mode"
export const photoInput = "photo"
export const aspectInput = "aspect"
export const sideInputs = expandSides

const defaultFormat = "16-9"

export function modeOf(value: unknown): ExpandMode {
  return value === "sides" ? "sides" : "format"
}

export function formatOf(value: FieldValue): string {
  return typeof value === "string" ? value : defaultFormat
}

export function ratioOf(value: FieldValue): string {
  return ratioOfFormat(formatOf(value))
}

export function bodyAppFor(app: AppListing, mode: ExpandMode): AppListing {
  const applied = new Set(
    inputRulesOf(app, { [modeInput]: mode }).map((rule) => rule.input.name)
  )
  return {
    ...app,
    inputs: app.inputs.filter((input) => applied.has(input.name)),
  }
}
