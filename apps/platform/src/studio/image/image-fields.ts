import type { ModelField } from "@rosesfield/catalog/comfy"
import { isShownField } from "@/screens/app/hosted/hosted-fields"

type ChoiceField = Extract<ModelField, { kind: "choice" }>
type MediaField = Extract<ModelField, { kind: "media" }>
type NumberField = Extract<ModelField, { kind: "number" }>

export type ImageFields = {
  references: MediaField | null
  aspect: ChoiceField | null
  size: ChoiceField | null
  count: NumberField | null
  rest: ModelField[]
}

export type CountBounds = {
  min: number
  max: number
  value: number
}

const maxCount = 4

const aspectNames = /^(aspect_ratio|aspectratio|aspect|ratio)$/i

const sizeNames = /^(resolution|output_resolution|size|quality)$/

const countNames =
  /^(n|num_images|sample_count|count|num_outputs|number_of_images)$/

function lastOf(field: ModelField): string {
  return field.path.split(".").at(-1) ?? field.path
}

function choiceNamed(
  fields: readonly ModelField[],
  names: RegExp
): ChoiceField | null {
  return (
    fields.find(
      (field): field is ChoiceField =>
        field.kind === "choice" &&
        field.options.length > 1 &&
        names.test(lastOf(field))
    ) ?? null
  )
}

function referencesOf(fields: readonly ModelField[]): MediaField | null {
  const images = fields.filter(
    (field): field is MediaField =>
      field.kind === "media" && field.media === "image"
  )
  return images.find((field) => field.name === "images") ?? images[0] ?? null
}

function countOf(fields: readonly ModelField[]): NumberField | null {
  return (
    fields.find(
      (field): field is NumberField =>
        field.kind === "number" &&
        field.integer &&
        countNames.test(lastOf(field)) &&
        (field.max === null || field.max >= 2)
    ) ?? null
  )
}

export function isGraphModel(model: string): boolean {
  return model !== "" && !model.includes("/")
}

export function imageFieldsOf(fields: readonly ModelField[]): ImageFields {
  const references = referencesOf(fields)
  const aspect = choiceNamed(fields, aspectNames)
  const size = choiceNamed(fields, sizeNames)
  const count = countOf(fields)
  const placed = new Set(
    [references, aspect, size, count].flatMap((field) =>
      field === null ? [] : [field.name]
    )
  )
  return {
    references,
    aspect,
    size,
    count,
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
