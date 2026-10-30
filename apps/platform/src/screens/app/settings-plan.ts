import {
  type FieldRole,
  fieldRoleOf,
  inputRoleOf,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type InputDefinition,
  isChainFilled,
} from "@rosesfield/contract"
import { settingOf } from "@/catalog/setting-registry"
import { formatDuration } from "@/copy/format"
import { t } from "@/copy/t"
import { modelInputName } from "@/pieces/run/run-facts"
import { aspectField, countField } from "@/screens/app/app-form"
import {
  fieldPlaceOf,
  inputPlaceOf,
  type SettingPlace,
  switchWordsOf,
} from "@/screens/app/setting-table"

export type SettingKey = {
  name: string
  role: FieldRole | null
  place: SettingPlace
}

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
      return {
        item,
        index,
        place: key.place,
        setting: settingOf(key.name, key.role),
      }
    })
    .sort((a, b) => a.setting.rank - b.setting.rank || a.index - b.index)
  const placed = (place: SettingPlace): T[] =>
    ranked.filter((one) => one.place === place).map((one) => one.item)
  return { main: placed("show"), advanced: placed("advanced") }
}

export function isSettingInput(input: InputDefinition): input is SettingInput {
  return (
    input.name !== modelInputName &&
    !isChainFilled(input) &&
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
    (output.aspectRatios?.options.length ?? 0) > 1
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
        return { name: "aspect", role: "aspect", place: "show" }
      case "count":
        return { name: "count", role: "count", place: "show" }
      case "input":
        return {
          name: setting.input.name,
          role:
            setting.input.type === "seed"
              ? "seed"
              : inputRoleOf(setting.input.name, app.output.kind),
          place: inputPlaceOf(setting.input.name, setting.input.type),
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
    place: fieldPlaceOf(field).kind,
  }))
}

export type SettingControl = "switch" | "select" | "stepper" | "seed" | "text"

export type ChoiceOption = { value: string; label: string }

export type ControlShape =
  | { kind: "toggle" }
  | { kind: "number" }
  | { kind: "seed" }
  | { kind: "text" }
  | { kind: "choice"; options: readonly ChoiceOption[] }

export function booleanPairOf(
  options: readonly ChoiceOption[]
): { on: string; off: string } | null {
  return switchWordsOf(options.map((option) => [option.value, option.label]))
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
      return booleanPairOf(shape.options) === null ? "select" : "switch"
  }
}

const followValues: readonly string[] = [
  "adaptive",
  "auto",
  "match",
  "match_input",
]

export function fieldValueText(
  field: ModelField,
  value: string | number
): string {
  if (value === "") {
    return t("choice.none")
  }
  const place = fieldPlaceOf(field)
  if (
    place.kind === "show" &&
    place.setting === "format" &&
    followValues.includes(String(value).toLowerCase())
  ) {
    return t("choice.auto")
  }
  const seconds = Number(value)
  return fieldRoleOf(field, "") === "length" &&
    value !== "" &&
    Number.isFinite(seconds)
    ? formatDuration(seconds)
    : wordsOfValue(String(value))
}

function wordsOfValue(value: string): string {
  if (!/^[a-z]+([ _-][a-z]+)*$/.test(value)) {
    return value
  }
  const words = value.replace(/[_-]/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function fieldOptionsOf(
  field: Extract<ModelField, { kind: "choice" }>
): ChoiceOption[] {
  return field.options.map((option) => ({
    value: String(option),
    label: fieldValueText(field, option),
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
