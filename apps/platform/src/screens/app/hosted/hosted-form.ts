import { isOneAtATime, type ModelField } from "@rosesfield/catalog/comfy"
import type {
  FieldProblem,
  FieldValue,
  FormValues,
  StartRunBodyInput,
} from "@/screens/app/app-form"
import { fieldCaption } from "@/screens/app/hosted/field-words"

export const modelInputName = "model"

const automatic = "auto"

function choiceDefaultOf(options: readonly (string | number)[]): FieldValue {
  if (options.length === 1) {
    return options[0]
  }
  return options.includes(automatic) ? automatic : undefined
}

function defaultOf(field: ModelField): FieldValue {
  switch (field.kind) {
    case "prompt":
    case "text":
      return field.default ?? ""
    case "choice":
      return field.default ?? choiceDefaultOf(field.options)
    case "number":
      return field.default ?? undefined
    case "toggle":
      return field.default === null ? undefined : field.default ? "on" : "off"
    case "media":
      return []
  }
}

export function hostedDefaults(
  fields: readonly ModelField[],
  kept: Readonly<Record<string, FieldValue>>
): Record<string, FieldValue> {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.kind === "prompt" && typeof kept[field.name] === "string"
        ? kept[field.name]
        : defaultOf(field),
    ])
  )
}

function fitsField(field: ModelField, value: FieldValue): boolean {
  switch (field.kind) {
    case "prompt":
    case "text":
      return typeof value === "string"
    case "choice":
      return (
        value !== undefined &&
        !Array.isArray(value) &&
        field.options.some((option) => String(option) === String(value))
      )
    case "number":
      return (
        typeof value === "number" &&
        (field.min === null || value >= field.min) &&
        (field.max === null || value <= field.max)
      )
    case "toggle":
      return value === "on" || value === "off"
    case "media":
      return Array.isArray(value) && value.length <= field.max
  }
}

export function settingsFor(
  fields: readonly ModelField[],
  kept: Readonly<Record<string, FieldValue>>
): Record<string, FieldValue> {
  const defaults = hostedDefaults(fields, kept)
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      fitsField(field, kept[field.name])
        ? kept[field.name]
        : defaults[field.name],
    ])
  )
}

function isEmpty(value: FieldValue): boolean {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
}

export function hostedBody(
  model: string,
  fields: readonly ModelField[],
  values: FormValues,
  output: string
): StartRunBodyInput {
  const inputs: Record<string, string | number | string[]> = {
    [modelInputName]: model,
  }
  for (const field of fields) {
    const given = values.inputs[field.name]
    const value =
      field.kind === "choice" && !isEmpty(given) && !fitsField(field, given)
        ? (field.default ?? undefined)
        : given
    if (value !== undefined && !isEmpty(value)) {
      inputs[field.name] = value
    }
  }
  return isOneAtATime(fields, output) && values.count > 1
    ? { inputs, count: values.count }
    : { inputs }
}

function missingOf(field: ModelField): FieldProblem {
  const name = field.name
  switch (field.kind) {
    case "media":
      return { name, key: "field.asset.required", values: {} }
    case "prompt":
      return { name, key: "field.prompt.required", values: {} }
    case "text":
      return { name, key: "bar.notSet", values: { field: fieldCaption(field) } }
    case "number":
      return { name, key: "field.number.required", values: {} }
    default:
      return { name, key: "field.choice.required", values: {} }
  }
}

function problemOf(field: ModelField, value: FieldValue): FieldProblem | null {
  const name = field.name
  if (field.required && isEmpty(value)) {
    return missingOf(field)
  }
  if (
    field.kind === "media" &&
    Array.isArray(value) &&
    value.length > field.max
  ) {
    return { name, key: "field.asset.tooMany", values: { max: field.max } }
  }
  if (field.kind === "number" && typeof value === "number") {
    const isLow = field.min !== null && value < field.min
    const isHigh = field.max !== null && value > field.max
    return isLow || isHigh
      ? {
          name,
          key: "field.number.outOfRange",
          values: { min: field.min ?? value, max: field.max ?? value },
        }
      : null
  }
  if (
    (field.kind === "prompt" || field.kind === "text") &&
    typeof value === "string" &&
    field.maxLength !== null &&
    value.length > field.maxLength
  ) {
    return {
      name,
      key: "field.prompt.count",
      values: { count: value.length, max: field.maxLength },
    }
  }
  return null
}

export function hostedProblems(
  fields: readonly ModelField[],
  values: FormValues
): FieldProblem[] {
  return fields
    .map((field) => problemOf(field, values.inputs[field.name]))
    .filter((problem): problem is FieldProblem => problem !== null)
}
