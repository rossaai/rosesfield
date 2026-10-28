import { fieldRoleOf, type ModelField } from "@rosesfield/catalog/comfy"
import { type CountSwitch, countSwitchOf } from "@/screens/app/setting-table"

export type BodyInputs = Record<string, string | number | string[]>

export function withCountSwitch(
  fields: readonly ModelField[],
  inputs: BodyInputs
): BodyInputs {
  const found = countSwitchOf(fields)
  const count = fields.find((field) => fieldRoleOf(field, "") === "count")
  if (found === null || count === undefined) {
    return inputs
  }
  const value = inputs[count.name]
  if (typeof value === "number" && value > 1) {
    return { ...inputs, [found.field.name]: found.many }
  }
  const single = Object.fromEntries(
    Object.entries(inputs).filter(
      ([name]) => name !== count.name && name !== found.field.name
    )
  )
  return found.one === null
    ? single
    : { ...single, [found.field.name]: found.one }
}

type NumberField = Extract<ModelField, { kind: "number" }>

function seriesCountOf(fields: readonly ModelField[]): NumberField | null {
  const counts = fields.filter(
    (field): field is NumberField =>
      field.kind === "number" && fieldRoleOf(field, "") === "count"
  )
  const series = counts.find((field) => field.min !== null && field.min > 1)
  return counts.length > 1 && series !== undefined ? series : null
}

function withPlainCount(
  fields: readonly ModelField[],
  found: CountSwitch,
  series: NumberField
): ModelField[] {
  return fields.flatMap((field): ModelField[] => {
    if (field === series || (field === found.field && found.one === null)) {
      return []
    }
    return field === found.field && found.one !== null
      ? [{ ...found.field, options: [found.one], default: found.one }]
      : [field]
  })
}

/** Reads a model's form as the platform shows it, with one count. A model with its own count from one beside a series count shows that count, and its series switch stays at its single result. Otherwise the count a series switch turns on counts from one, as the switch's single result. */
export function shownFormOf(fields: readonly ModelField[]): ModelField[] {
  const found = countSwitchOf(fields)
  const series = seriesCountOf(fields)
  if (found !== null && series !== null) {
    return withPlainCount(fields, found, series)
  }
  return fields.map((field) =>
    found !== null &&
    field.kind === "number" &&
    fieldRoleOf(field, "") === "count"
      ? { ...field, min: 1, default: 1 }
      : field
  )
}
