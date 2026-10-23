import {
  type FieldRole,
  fieldRoleOf,
  isOneAtATime,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
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

type MediaField = Extract<ModelField, { kind: "media" }>

type MediaKind = MediaField["media"]

export type HeldMedia = Readonly<Partial<Record<MediaKind, readonly string[]>>>

const imageRanks: Partial<Record<FieldRole, number>> = {
  "first-frame": 0,
  reference: 1,
  "last-frame": 2,
}

function rankOf(field: MediaField, output: string): number | null {
  if (field.media !== "image") {
    return 0
  }
  const role = fieldRoleOf(field, output)
  return role === null ? null : (imageRanks[role] ?? null)
}

function placeableOf(
  fields: readonly ModelField[],
  output: string
): MediaField[] {
  return fields
    .filter(
      (field): field is MediaField =>
        field.kind === "media" && rankOf(field, output) !== null
    )
    .sort((a, b) => (rankOf(a, output) ?? 0) - (rankOf(b, output) ?? 0))
}

function filesOf(value: FieldValue): string[] {
  return Array.isArray(value)
    ? value.filter((one): one is string => typeof one === "string")
    : []
}

export function appMediaFieldsOf(app: AppListing): MediaField[] {
  return app.inputs.flatMap((input): MediaField[] =>
    input.type === "image" || input.type === "video" || input.type === "audio"
      ? [
          {
            kind: "media",
            name: input.name,
            path: input.name,
            required: input.presence === "required",
            media: input.type,
            min: 0,
            max: input.max,
          },
        ]
      : []
  )
}

export function heldMediaOf(
  fields: readonly ModelField[],
  inputs: Readonly<Record<string, FieldValue>>,
  held: HeldMedia,
  output: string
): HeldMedia {
  const next: Partial<Record<MediaKind, readonly string[]>> = { ...held }
  const placeable = placeableOf(fields, output)
  for (const kind of new Set(placeable.map((field) => field.media))) {
    next[kind] = placeable
      .filter((field) => field.media === kind)
      .flatMap((field) => filesOf(inputs[field.name]))
  }
  return next
}

export function placedMedia(
  fields: readonly ModelField[],
  held: HeldMedia,
  kept: Readonly<Record<string, FieldValue>>,
  output: string
): Record<string, string[]> {
  const placeable = placeableOf(fields, output)
  const placed: Record<string, string[]> = {}
  const used = new Set<string>()
  for (const field of placeable) {
    const same = filesOf(kept[field.name])
    if (same.length > 0 && fitsField(field, same)) {
      placed[field.name] = same
      for (const file of same) {
        used.add(file)
      }
    }
  }
  const queues = new Map(
    Object.entries(held).map(([kind, files]) => [
      kind,
      (files ?? []).filter((file) => !used.has(file)),
    ])
  )
  for (const field of placeable) {
    if (placed[field.name] !== undefined) {
      continue
    }
    const queue = queues.get(field.media) ?? []
    placed[field.name] = queue.splice(0, field.max)
  }
  return placed
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
