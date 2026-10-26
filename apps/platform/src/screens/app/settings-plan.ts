import {
  type FieldRole,
  fieldRoleOf,
  inputRoleOf,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { settingOf } from "@/catalog/setting-registry"
import { modelInputName } from "@/pieces/run/run-facts"
import { aspectField, countField } from "@/screens/app/app-form"

export type SettingKey = { name: string; role: FieldRole | null }

export type SettingsPlan<T> = { main: T[]; advanced: T[] }

export type SettingInput = Extract<
  InputDefinition,
  { type: "choice" | "number" | "toggle" | "seed" }
>

export type AppSetting =
  | { kind: "input"; input: SettingInput }
  | { kind: "aspect" }
  | { kind: "count" }

export function settingsPlanOf<T>(
  settings: readonly T[],
  keyOf: (setting: T) => SettingKey
): SettingsPlan<T> {
  const ranked = settings
    .map((item, index) => {
      const key = keyOf(item)
      return { item, index, setting: settingOf(key.name, key.role) }
    })
    .sort((a, b) => a.setting.rank - b.setting.rank || a.index - b.index)
  return {
    main: ranked
      .filter((one) => one.setting.group !== "advanced")
      .map((one) => one.item),
    advanced: ranked
      .filter((one) => one.setting.group === "advanced")
      .map((one) => one.item),
  }
}

export function isSettingInput(input: InputDefinition): input is SettingInput {
  return (
    input.name !== modelInputName &&
    (input.type === "choice" ||
      input.type === "number" ||
      input.type === "toggle" ||
      input.type === "seed")
  )
}

function hasAspectChoice(app: AppListing): boolean {
  const { output } = app
  return (
    (output.kind === "image" || output.kind === "video") &&
    output.aspectRatios.options.length > 1
  )
}

export function appSettingsOf(
  app: AppListing,
  except: readonly string[] = []
): AppSetting[] {
  const settings: AppSetting[] = []
  if (hasAspectChoice(app) && !except.includes(aspectField)) {
    settings.push({ kind: "aspect" })
  }
  if (app.output.count.max > 1 && !except.includes(countField)) {
    settings.push({ kind: "count" })
  }
  for (const input of app.inputs.filter(isSettingInput)) {
    if (!except.includes(input.name)) {
      settings.push({ kind: "input", input })
    }
  }
  return settings
}

export function appSettingKeyOf(
  app: AppListing
): (setting: AppSetting) => SettingKey {
  return (setting) => {
    switch (setting.kind) {
      case "aspect":
        return { name: "aspect", role: "aspect" }
      case "count":
        return { name: "count", role: "count" }
      case "input":
        return {
          name: setting.input.name,
          role:
            setting.input.type === "seed"
              ? "seed"
              : inputRoleOf(setting.input.name, app.output.kind),
        }
    }
  }
}

export function appSettingsPlan(
  app: AppListing,
  except: readonly string[] = []
): SettingsPlan<AppSetting> {
  return settingsPlanOf(appSettingsOf(app, except), appSettingKeyOf(app))
}

export function isSettingField(field: ModelField): boolean {
  if (field.kind === "media" || field.kind === "prompt") {
    return false
  }
  return !(field.kind === "choice" && field.options.length === 1)
}

export function fieldSettingsPlan(
  fields: readonly ModelField[]
): SettingsPlan<ModelField> {
  return settingsPlanOf(fields.filter(isSettingField), (field) => ({
    name: field.name,
    role: fieldRoleOf(field, ""),
  }))
}

export type SettingControl =
  | "switch"
  | "segmented"
  | "select"
  | "stepper"
  | "seed"
  | "text"

export type ChoiceOption = { value: string; label: string }

export type ControlShape =
  | { kind: "toggle" }
  | { kind: "number" }
  | { kind: "seed" }
  | { kind: "text" }
  | { kind: "choice"; options: readonly ChoiceOption[] }

export const segmentLimit = 4

export const shortLabelLimit = 12

const booleanPairs: readonly (readonly [string, string])[] = [
  ["true", "false"],
  ["on", "off"],
  ["yes", "no"],
  ["enabled", "disabled"],
]

function wordsOf(option: ChoiceOption): string[] {
  return [option.value, option.label].map((word) => word.trim().toLowerCase())
}

export function booleanPairOf(
  options: readonly ChoiceOption[]
): { on: string; off: string } | null {
  const [first, second] = options
  if (options.length !== 2 || first === undefined || second === undefined) {
    return null
  }
  for (const [on, off] of booleanPairs) {
    if (wordsOf(first).includes(on) && wordsOf(second).includes(off)) {
      return { on: first.value, off: second.value }
    }
    if (wordsOf(second).includes(on) && wordsOf(first).includes(off)) {
      return { on: second.value, off: first.value }
    }
  }
  return null
}

export function controlOf(shape: ControlShape): SettingControl {
  switch (shape.kind) {
    case "toggle":
      return "switch"
    case "number":
      return "stepper"
    case "seed":
      return "seed"
    case "text":
      return "text"
    case "choice":
      if (booleanPairOf(shape.options) !== null) {
        return "switch"
      }
      return shape.options.length <= segmentLimit &&
        shape.options.every((option) => option.label.length <= shortLabelLimit)
        ? "segmented"
        : "select"
  }
}

export function fieldOptionsOf(
  field: Extract<ModelField, { kind: "choice" }>
): ChoiceOption[] {
  return field.options.map((option) => ({
    value: String(option),
    label: String(option),
  }))
}

export function fieldShapeOf(field: ModelField): ControlShape {
  switch (field.kind) {
    case "toggle":
      return { kind: "toggle" }
    case "number":
      return fieldRoleOf(field, "") === "seed"
        ? { kind: "seed" }
        : { kind: "number" }
    case "choice":
      return { kind: "choice", options: fieldOptionsOf(field) }
    default:
      return { kind: "text" }
  }
}
