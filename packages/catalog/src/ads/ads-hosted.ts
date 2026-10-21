import { fieldRoleOf, type ModelField } from "@rosesfield/generation/bindings"
import { adsPromptOf } from "#ads/ads-prompt"
import { photoInputs } from "#ads/ads-values"

type MediaField = Extract<ModelField, { kind: "media" }>

export type AdsHostedAsk = {
  inputs: Readonly<Record<string, unknown>>
  fields: readonly ModelField[]
  characterPhoto: string | null
  aspectRatio: string | null
}

const imageOutput = "image"

function idsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((one): one is string => typeof one === "string")
    : []
}

function referenceFieldOf(fields: readonly ModelField[]): MediaField | null {
  const images = fields.filter(
    (field): field is MediaField =>
      field.kind === "media" &&
      field.media === imageOutput &&
      fieldRoleOf(field, imageOutput) !== null
  )
  return images.reduce<MediaField | null>(
    (widest, field) =>
      widest === null || field.max > widest.max ? field : widest,
    null
  )
}

function aspectFieldOf(
  fields: readonly ModelField[],
  aspectRatio: string | null
): ModelField | null {
  return aspectRatio === null
    ? null
    : (fields.find(
        (field) =>
          field.kind === "choice" &&
          fieldRoleOf(field, imageOutput) === "aspect" &&
          field.options.map(String).includes(aspectRatio)
      ) ?? null)
}

export function adsHostedInputsOf(
  ask: AdsHostedAsk
): Record<string, string | string[]> {
  const sent: Record<string, string | string[]> = {}
  const prompt = ask.fields.find(
    (field) => fieldRoleOf(field, imageOutput) === "prompt"
  )
  if (prompt !== undefined) {
    sent[prompt.name] = adsPromptOf(ask.inputs)
  }
  const photos = [
    ...photoInputs.flatMap((name) => idsOf(ask.inputs[name])),
    ...(ask.characterPhoto === null ? [] : [ask.characterPhoto]),
  ]
  const references = referenceFieldOf(ask.fields)
  if (references !== null && photos.length > 0) {
    sent[references.name] = photos
  }
  const aspect = aspectFieldOf(ask.fields, ask.aspectRatio)
  if (aspect !== null && ask.aspectRatio !== null) {
    sent[aspect.name] = ask.aspectRatio
  }
  return sent
}
