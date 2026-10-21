import type { InputValue } from "@rosesfield/contract"
import { fieldRoleOf, type ModelField } from "@rosesfield/generation/bindings"
import {
  type AssetId,
  assetIdFormat,
  characterIdFormat,
} from "@rosesfield/kernel"
import { setPoses } from "#angles/angle-views"
import {
  loraDistanceWords,
  loraHeightWords,
  loraSideWords,
} from "#angles/comfy/angle-words"
import { angleSets } from "#characters/angle-sets"
import { viewDistance } from "#characters/comfy/angles-binding"
import { traitPrompt } from "#characters/comfy/traits-prompt"
import { traitNames } from "#characters/traits"

type Inputs = Readonly<Record<string, unknown>>

type MediaField = Extract<ModelField, { kind: "media" }>

export type HostedInputs = Record<string, InputValue>

const output = "image"

const modelInput = "model"

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

export function anglePromptsOf(angleSet: unknown): string[] {
  const set = angleSets.find((one) => one === angleSet) ?? defaultSet
  return setPoses[set].map((pose) =>
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
  const shared: HostedInputs =
    typeof model === "string" ? { [modelInput]: model } : {}
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

export function hostedRunsOf(
  fields: readonly ModelField[],
  inputs: Inputs,
  photos: readonly AssetId[]
): HostedInputs[] {
  const prompt = fields.find((field) => fieldRoleOf(field, output) === "prompt")
  if (prompt === undefined) {
    return []
  }
  if (inputs.mode !== "angles") {
    const shared = sharedInputsOf(fields, inputs, new Set([prompt.name]))
    return [{ ...shared, [prompt.name]: traitPrompt(inputs) }]
  }
  const image = fields.find(isReference)
  if (image === undefined || photos.length === 0) {
    return []
  }
  const shared = sharedInputsOf(
    fields,
    inputs,
    new Set([prompt.name, image.name])
  )
  const references = photos.slice(0, image.max)
  return anglePromptsOf(inputs.angleSet).map((text) => ({
    ...shared,
    [prompt.name]: text,
    [image.name]: references,
  }))
}
