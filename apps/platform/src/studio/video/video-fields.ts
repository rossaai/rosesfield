import type { ModelField } from "@rosesfield/catalog/comfy"
import { isShownField } from "@/screens/app/hosted/hosted-fields"

type MediaField = Extract<ModelField, { kind: "media" }>
type ChoiceField = Extract<ModelField, { kind: "choice" }>
type NumberField = Extract<ModelField, { kind: "number" }>
type ToggleField = Extract<ModelField, { kind: "toggle" }>
type PromptField = Extract<ModelField, { kind: "prompt" | "text" }>

export type ChipField = ChoiceField | NumberField

export type VideoFields = {
  prompt: PromptField | null
  start: MediaField | null
  last: MediaField | null
  references: MediaField | null
  length: ChipField | null
  aspect: ChoiceField | null
  resolution: ChoiceField | null
  sound: ToggleField | null
  required: ModelField[]
  rest: ModelField[]
}

const lastNames = /(last|end|tail)[_ ]?(frame|image)/i

const referenceNames = /reference/i

const maskNames = /mask/i

const lengthNames =
  /^(duration|duration_seconds|durationseconds|durations|seconds|length)$/i

const aspectNames = /^(aspect_ratio|aspectratio|aspect|ratio)$/i

const resolutionNames = /^(resolution|output_resolution)$/i

const soundNames = /^(generate_?audio|save_?audio|with_?audio|sound|audio)$/i

function lastOf(field: ModelField): string {
  return field.path.split(".").at(-1) ?? field.path
}

function images(fields: readonly ModelField[]): MediaField[] {
  return fields.filter(
    (field): field is MediaField =>
      field.kind === "media" && field.media === "image"
  )
}

function lastFrameOf(fields: readonly ModelField[]): MediaField | null {
  return images(fields).find((field) => lastNames.test(field.path)) ?? null
}

function startOf(fields: readonly ModelField[]): MediaField | null {
  const plain = images(fields).filter(
    (field) =>
      !lastNames.test(field.path) &&
      !referenceNames.test(field.path) &&
      !maskNames.test(field.path)
  )
  return plain.find((field) => field.name === "images") ?? plain[0] ?? null
}

function referencesOf(
  fields: readonly ModelField[],
  start: MediaField | null
): MediaField | null {
  const named = images(fields).find((field) => referenceNames.test(field.path))
  if (named !== undefined) {
    return named
  }
  return start !== null && start.max > 1 ? start : null
}

function isChip(field: ModelField): field is ChipField {
  return (
    (field.kind === "number" && field.min !== null && field.max !== null) ||
    (field.kind === "choice" && field.options.length > 1)
  )
}

function chipOf(
  fields: readonly ModelField[],
  names: RegExp
): ChipField | null {
  return (
    fields.filter(isChip).find((field) => names.test(lastOf(field))) ?? null
  )
}

function choiceOf(
  fields: readonly ModelField[],
  names: RegExp
): ChoiceField | null {
  const field = chipOf(fields, names)
  return field?.kind === "choice" ? field : null
}

function soundOf(fields: readonly ModelField[]): ToggleField | null {
  return (
    fields.find(
      (field): field is ToggleField =>
        field.kind === "toggle" && soundNames.test(lastOf(field))
    ) ?? null
  )
}

export function videoFieldsOf(fields: readonly ModelField[]): VideoFields {
  const prompt =
    fields.find((field): field is PromptField => field.kind === "prompt") ??
    null
  const start = startOf(fields)
  const last = lastFrameOf(fields)
  const references = referencesOf(fields, start)
  const length = chipOf(fields, lengthNames)
  const aspect = choiceOf(fields, aspectNames)
  const resolution = choiceOf(fields, resolutionNames)
  const sound = soundOf(fields)
  const placed = new Set(
    [prompt, start, last, references, length, aspect, resolution, sound]
      .filter((field): field is ModelField => field !== null)
      .map((field) => field.name)
  )
  const shown = fields.filter(
    (field) =>
      !placed.has(field.name) && field.kind !== "media" && isShownField(field)
  )
  return {
    prompt,
    start,
    last,
    references,
    length,
    aspect,
    resolution,
    sound,
    required: shown.filter((field) => field.required),
    rest: shown.filter((field) => !field.required),
  }
}

function heightOf(option: string | number): number {
  const text = String(option).toLowerCase()
  if (text === "4k") {
    return 2160
  }
  if (text === "2k") {
    return 1440
  }
  const sized = /^(\d{3,4})\s*[x*]\s*(\d{3,4})$/.exec(text)
  if (sized !== null) {
    return Math.min(Number(sized[1]), Number(sized[2]))
  }
  const named = /^(\d{3,4})p$/.exec(text)
  return named === null ? Number.POSITIVE_INFINITY : Number(named[1])
}

const wantedSeconds = 5

const wantedAspect = "16:9"

function nearestSeconds(field: ChipField): string | number | undefined {
  if (field.kind === "number") {
    return Math.min(
      field.max ?? wantedSeconds,
      Math.max(field.min ?? wantedSeconds, wantedSeconds)
    )
  }
  return [...field.options].sort(
    (a, b) =>
      Math.abs(Number(a) - wantedSeconds) - Math.abs(Number(b) - wantedSeconds)
  )[0]
}

function isAllowed(field: ChipField, value: unknown): boolean {
  if (field.kind === "number") {
    return (
      typeof value === "number" &&
      value >= (field.min ?? value) &&
      value <= (field.max ?? value)
    )
  }
  return field.options.some((option) => String(option) === String(value))
}

export function chipDefaultsOf(
  fields: VideoFields,
  inputs: Readonly<Record<string, unknown>>
): Record<string, string | number> {
  const fixes: Record<string, string | number> = {}
  const fix = (
    field: ChipField | null,
    pick: (field: ChipField) => string | number | undefined
  ): void => {
    if (field === null || isAllowed(field, inputs[field.name])) {
      return
    }
    const value = pick(field)
    if (value !== undefined) {
      fixes[field.name] = value
    }
  }
  fix(fields.length, nearestSeconds)
  fix(fields.resolution, (field) =>
    field.kind === "choice"
      ? [...field.options].sort((a, b) => heightOf(a) - heightOf(b))[0]
      : undefined
  )
  fix(fields.aspect, (field) =>
    field.kind === "choice"
      ? (field.options.find((one) => String(one) === wantedAspect) ??
        field.default ??
        field.options[0])
      : undefined
  )
  const sound = fields.sound
  if (sound !== null && inputs[sound.name] === undefined) {
    fixes[sound.name] = sound.default === false ? "off" : "on"
  }
  return fixes
}
