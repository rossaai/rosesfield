import {
  type FieldRole,
  fieldRoleOf,
  isOneAtATime,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import { isShownField } from "@/screens/app/hosted/hosted-fields"

type ChoiceField = Extract<ModelField, { kind: "choice" }>
type MediaField = Extract<ModelField, { kind: "media" }>
type NumberField = Extract<ModelField, { kind: "number" }>

export type ImageFields = {
  references: MediaField | null
  aspect: ChoiceField | null
  resolution: ChoiceField | null
  quality: ChoiceField | null
  count: NumberField | null
  isOneAtATime: boolean
  rest: ModelField[]
}

export type CountBounds = {
  min: number
  max: number
  value: number
}

const maxCount = 4

const output = "image"

function hasRole(field: ModelField, role: FieldRole): boolean {
  return fieldRoleOf(field, output) === role
}

function choiceOf(
  fields: readonly ModelField[],
  role: FieldRole
): ChoiceField | null {
  return (
    fields.find(
      (field): field is ChoiceField =>
        field.kind === "choice" &&
        field.options.length > 1 &&
        hasRole(field, role)
    ) ?? null
  )
}

function referencesOf(fields: readonly ModelField[]): MediaField | null {
  const images = fields.filter(
    (field): field is MediaField =>
      field.kind === "media" && hasRole(field, "reference")
  )
  return images.find((field) => field.name === "images") ?? images[0] ?? null
}

function countOf(fields: readonly ModelField[]): NumberField | null {
  return (
    fields.find(
      (field): field is NumberField =>
        field.kind === "number" &&
        field.integer &&
        hasRole(field, "count") &&
        (field.max === null || field.max >= 2)
    ) ?? null
  )
}

export function isGraphModel(model: string): boolean {
  return model !== "" && !model.includes("/")
}

export function imageFieldsOf(fields: readonly ModelField[]): ImageFields {
  const references = referencesOf(fields)
  const aspect = choiceOf(fields, "aspect")
  const resolution = choiceOf(fields, "resolution")
  const quality = choiceOf(fields, "quality")
  const count = countOf(fields)
  const placed = new Set(
    [references, aspect, resolution, quality, count].flatMap((field) =>
      field === null ? [] : [field.name]
    )
  )
  return {
    references,
    aspect,
    resolution,
    quality,
    count,
    isOneAtATime: isOneAtATime(fields, output),
    rest: fields.filter(
      (field) =>
        field.kind !== "prompt" &&
        !placed.has(field.name) &&
        isShownField(field)
    ),
  }
}

export function countBoundsOf(field: NumberField, value: unknown): CountBounds {
  const min = Math.max(1, field.min ?? 1)
  const max = Math.min(maxCount, field.max ?? maxCount)
  const chosen = typeof value === "number" ? value : (field.default ?? min)
  return { min, max, value: Math.min(max, Math.max(min, chosen)) }
}

export function roomFor(field: MediaField, held: number): number {
  return Math.max(0, field.max - held)
}
