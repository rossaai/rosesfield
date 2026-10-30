import type { InputValue } from "@rosesfield/contract"
import { fieldRoleOf, type ModelField } from "@rosesfield/generation/bindings"
import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { hasPhoto, photoInput, sheetPrompt } from "#ai-influencer/sheet-prompt"
import { traitInputNames } from "#ai-influencer/traits"

type Inputs = Readonly<Record<string, unknown>>

export type SheetInputs = Record<string, InputValue>

export const promptInput = "prompt"

export const detailsInput = "details"

export const sheetAspect = "16:9"

/** The quality a hosted model's sheet opens at: GPT Image 2.5 drew the mantis right in both views at medium. */
export const sheetQuality = "medium"

const output = "image"

const ownNames: readonly string[] = [...traitInputNames, detailsInput]

function ownInputsOf(inputs: Inputs): SheetInputs {
  const own: SheetInputs = {}
  for (const name of ownNames) {
    const value = inputs[name]
    if (typeof value === "string" && value !== "") {
      own[name] = value
    }
  }
  return own
}

function photosOf(inputs: Inputs): AssetId[] {
  const photo = inputs[photoInput]
  return Array.isArray(photo)
    ? photo.filter((one): one is AssetId => assetIdFormat.is(one))
    : []
}

/** The inputs a run on one of the app's own graphs sends: what the person picked, with the prompt the traits compose. */
export function withSheetPrompt<Given extends Inputs>(
  inputs: Given
): Given & { prompt: string } {
  return { ...inputs, prompt: sheetPrompt(inputs) }
}

const sheetRatio = 16 / 9

function sizeRatioOf(option: string): number | null {
  const size = /^(\d+)x(\d+)$/.exec(option)
  const width = Number(size?.[1])
  const height = Number(size?.[2])
  return size === null || height === 0 ? null : width / height
}

/** The option of a model's aspect or size field that draws the sheet: 16:9 itself, else the size closest to 16:9, else none. */
export function sheetShapeOf(
  options: readonly (string | number)[]
): string | null {
  const texts = options.filter((one): one is string => typeof one === "string")
  if (texts.includes(sheetAspect)) {
    return sheetAspect
  }
  const sized = texts.flatMap((option) => {
    const ratio = sizeRatioOf(option)
    return ratio === null ? [] : [{ option, gap: Math.abs(ratio - sheetRatio) }]
  })
  const [closest] = sized.sort((left, right) => left.gap - right.gap)
  return closest !== undefined && closest.gap < sheetRatio - 1
    ? closest.option
    : null
}

function modelInputsOf(
  fields: readonly ModelField[],
  inputs: Inputs
): SheetInputs {
  const placed: SheetInputs = {}
  for (const field of fields) {
    const role = fieldRoleOf(field, output)
    if (role === "prompt") {
      placed[field.name] = sheetPrompt(inputs)
    }
    if (
      role === "reference" &&
      field.kind === "media" &&
      field.media === "image" &&
      hasPhoto(inputs)
    ) {
      placed[field.name] = photosOf(inputs).slice(0, field.max)
    }
    const shape =
      (role === "aspect" || role === "resolution") && field.kind === "choice"
        ? sheetShapeOf(field.options)
        : null
    if (shape !== null) {
      placed[field.name] = shape
    }
  }
  return placed
}

/** The inputs a run on a hosted model sends beside its own fields: the picked traits, the composed prompt in its prompt field, the photo in its reference field and 16:9 in its aspect field when it offers it. */
export function sheetHostedInputs(
  fields: readonly ModelField[],
  inputs: Inputs
): SheetInputs {
  return { ...ownInputsOf(inputs), ...modelInputsOf(fields, inputs) }
}
