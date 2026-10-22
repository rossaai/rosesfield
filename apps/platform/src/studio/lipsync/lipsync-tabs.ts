import {
  type CatalogModel,
  fieldOfRole,
  lengthOf,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { modelInputName } from "@/screens/app/hosted/hosted-form"

export type LipsyncTab = "photo" | "clip"

export const lipsyncTabs: readonly LipsyncTab[] = ["photo", "clip"]

export const tabKeys: Readonly<Record<LipsyncTab, string>> = {
  photo: "lipsync.choice.mode.photo",
  clip: "lipsync.choice.mode.clip",
}

export const tabsLabelKey = "lipsync.input.mode.label"

export const modeInput = "mode"

export const speechTask = "speech"

export const clipDefault = "byteplus/dreamina-seedance-2-5-260628"

export const nearModels: readonly string[] = [
  "kling/videos-avatar-image2video",
  "kling/videos-lip-sync",
]

type MediaField = Extract<ModelField, { kind: "media" }>
type TextField = Extract<ModelField, { kind: "prompt" | "text" }>

export type LengthLimit = { min: number; max: number }

export type LipFields = {
  all: readonly ModelField[]
  photo: MediaField | null
  clip: MediaField | null
  audio: MediaField | null
  text: TextField | null
  length: ModelField | null
  limit: LengthLimit | null
  rest: readonly ModelField[]
}

const output = "video"

const speechKeys: readonly string[] = ["text", "script", "speech", "words"]

const hiddenInputs: readonly string[] = [modelInputName, modeInput]

function fieldOfInput(input: InputDefinition): ModelField | null {
  const base = {
    name: input.name,
    path: input.name,
    required:
      "presence" in input &&
      input.presence === "required" &&
      input.when === undefined,
  }
  switch (input.type) {
    case "image":
    case "video":
    case "audio":
      return {
        ...base,
        kind: "media",
        media: input.type,
        min: 0,
        max: input.max,
      }
    case "prompt":
      return {
        ...base,
        kind: "prompt",
        maxLength: input.maxLength,
        default: null,
      }
    case "choice":
      return {
        ...base,
        kind: "choice",
        options: input.options.map((option) => option.value),
        default: input.default,
      }
    case "number":
      return {
        ...base,
        kind: "number",
        min: input.min,
        max: input.max,
        integer: Number.isInteger(input.step),
        default: input.default,
      }
    case "toggle":
      return { ...base, kind: "toggle", default: input.default === "on" }
    default:
      return null
  }
}

export function graphFieldsOf(app: AppListing): ModelField[] {
  return app.inputs.flatMap((input) => {
    const field = hiddenInputs.includes(input.name) ? null : fieldOfInput(input)
    return field === null ? [] : [field]
  })
}

export function formOfModel(
  model: CatalogModel | null,
  app: AppListing
): readonly ModelField[] | null {
  if (model === null) {
    return null
  }
  return model.form ?? (model.kind === "graph" ? graphFieldsOf(app) : null)
}

function mediaOf(
  fields: readonly ModelField[],
  media: MediaField["media"]
): MediaField | null {
  const held = fields.filter(
    (field): field is MediaField =>
      field.kind === "media" && field.media === media
  )
  return held.find((field) => field.required) ?? held[0] ?? null
}

function isSpeechText(field: ModelField): field is TextField {
  if (field.kind !== "prompt" && field.kind !== "text") {
    return false
  }
  const last = field.path.split(".").at(-1) ?? field.name
  return [field.name, last].some((key) =>
    speechKeys.includes(key.toLowerCase())
  )
}

function lengthFieldOf(fields: readonly ModelField[]): ModelField | null {
  const field = fieldOfRole(fields, "length", output)
  return field?.kind === "number" || field?.kind === "choice" ? field : null
}

export function lengthStepOf(
  app: AppListing,
  field: ModelField | null,
  isGraph: boolean
): number | null {
  if (field?.kind !== "number") {
    return null
  }
  const input = isGraph
    ? app.inputs.find((one) => one.name === field.name)
    : undefined
  if (input?.type === "number") {
    return input.step
  }
  return field.integer ? 1 : null
}

export function lipFieldsOf(fields: readonly ModelField[]): LipFields {
  const photo = mediaOf(fields, "image")
  const clip = mediaOf(fields, "video")
  const audio = mediaOf(fields, "audio")
  const text = fields.find(isSpeechText) ?? null
  const length = lengthFieldOf(fields)
  const placed = new Set(
    [photo, clip, audio, text, length]
      .filter((field): field is ModelField => field !== null)
      .map((field) => field.name)
  )
  return {
    all: fields,
    photo,
    clip,
    audio,
    text,
    length,
    limit: lengthOf(fields),
    rest: fields.filter(
      (field) => !placed.has(field.name) && field.kind !== "media"
    ),
  }
}

export function faceOf(
  fields: LipFields | null,
  tab: LipsyncTab
): MediaField | null {
  if (fields === null) {
    return null
  }
  return tab === "photo" ? fields.photo : fields.clip
}

export function tabsOfModel(
  model: CatalogModel,
  app: AppListing
): LipsyncTab[] {
  if (model.task === speechTask) {
    return []
  }
  const form = formOfModel(model, app)
  if (form === null) {
    return ["photo"]
  }
  const fields = lipFieldsOf(form)
  const photoFits = fields.photo !== null && fields.clip?.required !== true
  return lipsyncTabs.filter((tab) =>
    tab === "photo" ? photoFits : fields.clip !== null
  )
}

export function modelsOfTab(
  models: readonly CatalogModel[],
  tab: LipsyncTab,
  app: AppListing
): CatalogModel[] {
  return models.filter((model) => tabsOfModel(model, app).includes(tab))
}

export function defaultsOfTab(
  tab: LipsyncTab,
  appDefault: string | null
): string[] {
  return tab === "clip"
    ? [clipDefault]
    : appDefault === null
      ? []
      : [appDefault]
}

export function modelForTab(
  models: readonly CatalogModel[],
  chosen: string | null,
  defaults: readonly string[]
): string | null {
  for (const id of [chosen, ...defaults]) {
    if (id !== null && models.some((model) => model.id === id)) {
      return id
    }
  }
  return models[0]?.id ?? null
}

export function featuredOf(
  models: readonly CatalogModel[],
  ranBefore: readonly string[]
): string[] {
  const listed = new Set(models.map((model) => model.id))
  return [...nearModels, ...ranBefore].filter((id) => listed.has(id))
}

export function tabOfInputs(
  inputs: Readonly<Record<string, unknown>>,
  fields: LipFields | null
): LipsyncTab {
  const clip = fields?.clip ?? null
  const held = clip === null ? undefined : inputs[clip.name]
  return Array.isArray(held) && held.length > 0 ? "clip" : "photo"
}
