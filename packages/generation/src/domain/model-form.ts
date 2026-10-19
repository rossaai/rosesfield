import type { InputValue, RunInputs } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"

type FieldBase = {
  name: string
  path: string
  label: string
  required: boolean
}

export type MediaKind = "image" | "video" | "audio"

export type ModelField =
  | (FieldBase & {
      kind: "prompt" | "text"
      maxLength: number | null
      default: string | null
    })
  | (FieldBase & {
      kind: "choice"
      options: readonly (string | number)[]
      default: string | number | null
    })
  | (FieldBase & {
      kind: "number"
      min: number | null
      max: number | null
      integer: boolean
      default: number | null
    })
  | (FieldBase & { kind: "toggle"; default: boolean | null })
  | (FieldBase & { kind: "media"; media: MediaKind; min: number; max: number })

export type ModelForm = {
  model: string
  fields: readonly ModelField[]
}

export type CheckedInputs =
  | { kind: "valid"; inputs: RunInputs }
  | { kind: "invalid"; issues: string[] }

const modelInput = "model"

export function checkModelInputs(
  form: ModelForm,
  given: Readonly<Record<string, unknown>>
): CheckedInputs {
  const issues: string[] = []
  const inputs: Record<string, InputValue> = { [modelInput]: form.model }
  const known = new Set([modelInput, ...form.fields.map((one) => one.name)])
  for (const name of Object.keys(given)) {
    if (!known.has(name)) {
      issues.push(`${name}: the model takes no such input`)
    }
  }
  for (const field of form.fields) {
    const value = given[field.name]
    if (value === undefined || value === "") {
      if (field.required) {
        issues.push(`${field.name}: the model needs it`)
      }
      continue
    }
    const problem = problemOf(field, value)
    if (problem === null && isInputValue(value)) {
      inputs[field.name] = value
    } else {
      issues.push(`${field.name}: ${problem ?? "the value has the wrong type"}`)
    }
  }
  return issues.length === 0
    ? { kind: "valid", inputs }
    : { kind: "invalid", issues }
}

function isInputValue(value: unknown): value is InputValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    (Array.isArray(value) && value.every((one) => typeof one === "string"))
  )
}

function problemOf(field: ModelField, value: unknown): string | null {
  switch (field.kind) {
    case "prompt":
    case "text":
      return textProblem(field.maxLength, value)
    case "choice":
      return field.options.some((option) => String(option) === String(value))
        ? null
        : "the value is not one of the model's choices"
    case "number":
      return numberProblem(field, value)
    case "toggle":
      return value === "on" || value === "off" ? null : "the value is on or off"
    case "media":
      return mediaProblem(field, value)
  }
}

function textProblem(maxLength: number | null, value: unknown): string | null {
  if (typeof value !== "string") {
    return "the value is text"
  }
  return maxLength !== null && value.length > maxLength
    ? `the text is longer than ${maxLength} characters`
    : null
}

function numberProblem(
  field: Extract<ModelField, { kind: "number" }>,
  value: unknown
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "the value is a number"
  }
  if (field.integer && !Number.isInteger(value)) {
    return "the value is a whole number"
  }
  if (field.min !== null && value < field.min) {
    return `the value is at least ${field.min}`
  }
  return field.max !== null && value > field.max
    ? `the value is at most ${field.max}`
    : null
}

function mediaProblem(
  field: Extract<ModelField, { kind: "media" }>,
  value: unknown
): string | null {
  if (!Array.isArray(value) || !value.every((one) => assetIdFormat.is(one))) {
    return "the value is a list of assets"
  }
  if (value.length > field.max) {
    return `the model takes at most ${field.max}`
  }
  return field.required && value.length < field.min
    ? `the model needs at least ${field.min}`
    : null
}
