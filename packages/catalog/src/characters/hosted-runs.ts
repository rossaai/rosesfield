import type { InputValue } from "@rosesfield/contract"
import {
  fieldRoleOf,
  isOneAtATime,
  type ModelField,
} from "@rosesfield/generation/bindings"
import {
  type AssetId,
  assetIdFormat,
  characterIdFormat,
} from "@rosesfield/kernel"
import { type AngleSet, setPoses } from "#angles/angle-views"
import {
  loraDistanceWords,
  loraHeightWords,
  loraSideWords,
} from "#angles/comfy/angle-words"
import { angleSets, viewDistance } from "#characters/angle-sets"
import { traitPrompt } from "#characters/comfy/traits-prompt"
import { traitNames } from "#characters/traits"

type Inputs = Readonly<Record<string, unknown>>

type MediaField = Extract<ModelField, { kind: "media" }>

export type HostedInputs = Record<string, InputValue>

export type HostedRun = { inputs: HostedInputs; count?: number }

export type HostedRunsOptions = {
  photos: readonly AssetId[]
  count: number
}

export type AnglesGap = "model" | "character" | null

const output = "image"

const modelInput = "model"

const modeInput = "mode"

const characterInput = "character"

const angleSetInput = "angleSet"

const defaultSet = "turnaround"

const ownInputs: ReadonlySet<string> = new Set([
  "mode",
  "count",
  "framing",
  "details",
  "plainBackground",
  "character",
  "angleSet",
  ...traitNames,
])

const sameSubject =
  "The same subject as in the reference photo, with the same face, hair, body and clothes"

const viewBackground = "on a plain light grey studio background"

function angleSetOf(angleSet: unknown): AngleSet {
  return angleSets.find((one) => one === angleSet) ?? defaultSet
}

export function anglePromptsOf(angleSet: unknown): string[] {
  return setPoses[angleSetOf(angleSet)].map((pose) =>
    [
      sameSubject,
      loraSideWords[pose.side],
      loraHeightWords[pose.height],
      loraDistanceWords[viewDistance],
      viewBackground,
    ].join(", ")
  )
}

function isFilled(value: unknown): value is InputValue {
  if (typeof value === "string") {
    return value !== ""
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
  }
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((one) => assetIdFormat.is(one) || characterIdFormat.is(one))
  )
}

function isReference(field: ModelField): field is MediaField {
  return (
    field.kind === "media" &&
    field.media === "image" &&
    fieldRoleOf(field, output) === "reference"
  )
}

function sharedInputsOf(
  fields: readonly ModelField[],
  inputs: Inputs,
  skipped: ReadonlySet<string>
): HostedInputs {
  const model = inputs[modelInput]
  const mode = inputs[modeInput]
  const shared: HostedInputs =
    typeof model === "string" ? { [modelInput]: model } : {}
  if (
    typeof mode === "string" &&
    !fields.some((field) => field.name === modeInput)
  ) {
    shared[modeInput] = mode
  }
  for (const field of fields) {
    const value = inputs[field.name]
    if (
      !skipped.has(field.name) &&
      !ownInputs.has(field.name) &&
      isFilled(value)
    ) {
      shared[field.name] = value
    }
  }
  return shared
}

function anglesInputsOf(
  fields: readonly ModelField[],
  inputs: Inputs
): HostedInputs {
  const own = new Set(fields.map((field) => field.name))
  const kept: HostedInputs = {}
  const character = inputs[characterInput]
  if (!own.has(characterInput) && isFilled(character)) {
    kept[characterInput] = character
  }
  if (!own.has(angleSetInput)) {
    kept[angleSetInput] = angleSetOf(inputs[angleSetInput])
  }
  return kept
}

function promptOf(fields: readonly ModelField[]): ModelField | undefined {
  return fields.find((field) => fieldRoleOf(field, output) === "prompt")
}

export function anglesGapOf(
  fields: readonly ModelField[],
  photos: readonly AssetId[]
): AnglesGap {
  if (promptOf(fields) === undefined || !fields.some(isReference)) {
    return "model"
  }
  return photos.length === 0 ? "character" : null
}

export function hostedRunsOf(
  fields: readonly ModelField[],
  inputs: Inputs,
  options: HostedRunsOptions
): HostedRun[] {
  const prompt = promptOf(fields)
  if (prompt === undefined) {
    return []
  }
  if (inputs.mode !== "angles") {
    const shared = sharedInputsOf(fields, inputs, new Set([prompt.name]))
    const run = { ...shared, [prompt.name]: traitPrompt(inputs) }
    return isOneAtATime(fields, output) && options.count > 1
      ? [{ inputs: run, count: options.count }]
      : [{ inputs: run }]
  }
  const image = fields.find(isReference)
  if (image === undefined || options.photos.length === 0) {
    return []
  }
  const shared = {
    ...sharedInputsOf(fields, inputs, new Set([prompt.name, image.name])),
    ...anglesInputsOf(fields, inputs),
  }
  const references = options.photos.slice(0, image.max)
  return anglePromptsOf(inputs.angleSet).map((text) => ({
    inputs: { ...shared, [prompt.name]: text, [image.name]: references },
  }))
}
