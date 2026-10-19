import type { ModelField } from "@rosesfield/catalog/comfy"

type MediaField = Extract<ModelField, { kind: "media" }>
type NumberField = Extract<ModelField, { kind: "number" }>

export type ImageFields = {
  references: MediaField | null
  aspect: ModelField | null
  size: ModelField | null
  count: NumberField | null
  rest: ModelField[]
}

export type CountBounds = {
  min: number
  max: number
  value: number
}

const maxCount = 4

const aspectNames: readonly string[] = ["aspectratio", "aspect", "ratio"]

const sizeNames: readonly string[] = [
  "resolution",
  "outputresolution",
  "quality",
]

const countNames: readonly string[] = [
  "n",
  "numimages",
  "samplecount",
  "count",
  "numoutputs",
  "numberofimages",
]

function keyOf(field: ModelField): string {
  const last = field.path.split(".").at(-1) ?? field.path
  return last.replace(/[_-]/g, "").toLowerCase()
}

function isSetting(field: ModelField): boolean {
  return field.kind === "choice"
    ? field.options.length > 1
    : field.kind === "text"
}

function firstNamed(
  fields: readonly ModelField[],
  names: readonly string[]
): ModelField | null {
  for (const name of names) {
    const found = fields.find(
      (field) => keyOf(field) === name && isSetting(field)
    )
    if (found !== undefined) {
      return found
    }
  }
  return null
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
        countNames.includes(keyOf(field)) &&
        (field.max === null || field.max >= 2)
    ) ?? null
  )
}

function isShown(field: ModelField): boolean {
  return !(field.kind === "choice" && field.options.length === 1)
}

export function imageFieldsOf(fields: readonly ModelField[]): ImageFields {
  const references = referencesOf(fields)
  const aspect = firstNamed(fields, aspectNames)
  const size = firstNamed(fields, sizeNames)
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
        field.kind !== "prompt" && !placed.has(field.name) && isShown(field)
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
