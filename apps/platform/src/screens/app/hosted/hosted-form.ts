import type { ModelField } from "@rosesfield/catalog/comfy"
import type {
  FieldProblem,
  FieldValue,
  FormValues,
  StartRunBodyInput,
} from "@/screens/app/app-form"

export const modelInputName = "model"

function defaultOf(field: ModelField): FieldValue {
  switch (field.kind) {
    case "prompt":
    case "text":
      return field.default ?? ""
    case "choice":
      return (
        field.default ??
        (field.options.length === 1 ? field.options[0] : undefined)
      )
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
  values: FormValues
): StartRunBodyInput {
  const inputs: Record<string, string | number | string[]> = {
    [modelInputName]: model,
  }
  for (const field of fields) {
    const value = values.inputs[field.name]
    if (value !== undefined && !isEmpty(value)) {
      inputs[field.name] = value
    }
  }
  return { inputs }
}

function problemOf(field: ModelField, value: FieldValue): FieldProblem | null {
  const name = field.name
  if (field.required && isEmpty(value)) {
    return field.kind === "media"
      ? { name, key: "field.asset.required", values: {} }
      : { name, key: "field.prompt.required", values: {} }
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
