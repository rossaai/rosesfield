import {
  type CatalogModel,
  fieldRoleOf,
  type ModelField,
  type PriceResponse,
} from "@rosesfield/catalog/comfy"
import {
  editTask,
  type HostedAsk,
  type KeyframeCall,
  keyframeCallsOf,
  type StoryboardAsk,
} from "@rosesfield/catalog/storyboard"
import { type AppListing, runInputs } from "@rosesfield/contract"
import {
  bodyOf,
  type FieldValue,
  type FormValues,
} from "@/screens/app/app-form"
import {
  hostedDefaults,
  modelInputName,
} from "@/screens/app/hosted/hosted-form"
import type { PriceAsk } from "@/screens/app/hosted/model-catalog-query"
import { runValues } from "@/studio/storyboard/storyboard-form"

export type FormatField = Extract<ModelField, { kind: "choice" }>

export type Price = PriceResponse["price"] | undefined

export type PriceAsks = {
  text: PriceAsk | null
  edit: PriceAsk | null
  edits: number
}

const output = "image"

const ownRoles: readonly string[] = ["prompt", "seed", "count", "reference"]

export function settingFieldsOf(
  fields: readonly ModelField[]
): readonly ModelField[] {
  return fields.filter(
    (field) =>
      field.kind !== "prompt" &&
      field.kind !== "media" &&
      !ownRoles.includes(fieldRoleOf(field, output) ?? "")
  )
}

export function formatFieldOf(
  fields: readonly ModelField[]
): FormatField | null {
  return (
    fields.find(
      (field): field is FormatField =>
        field.kind === "choice" &&
        field.options.length > 1 &&
        fieldRoleOf(field, output) === "aspect"
    ) ?? null
  )
}

export function editModelsOf(models: readonly CatalogModel[]): CatalogModel[] {
  return models.filter((model) => model.task === editTask)
}

export function chosenModelOf(
  models: readonly CatalogModel[],
  value: string,
  defaultModel: string | null
): CatalogModel | null {
  return (
    models.find((model) => model.id === value) ??
    models.find((model) => model.id === defaultModel) ??
    null
  )
}

export function inputsForModel(
  inputs: FormValues["inputs"],
  model: CatalogModel
): Record<string, FieldValue> {
  const settings =
    model.form === null ? {} : hostedDefaults(settingFieldsOf(model.form), {})
  return { ...inputs, ...settings, [modelInputName]: model.id }
}

function hostedOf(
  values: FormValues,
  form: readonly ModelField[],
  photos: HostedAsk["photos"]
): HostedAsk {
  const settings: Record<string, string | number> = {}
  for (const field of settingFieldsOf(form)) {
    const value = values.inputs[field.name]
    const isSet =
      typeof value === "number" || (typeof value === "string" && value !== "")
    if (isSet) {
      settings[field.name] = value
    }
  }
  return { form, settings, photos }
}

export function storyboardAskOf(options: {
  app: AppListing
  values: FormValues
  chosen: CatalogModel | null
  photos: HostedAsk["photos"]
}): StoryboardAsk | null {
  const { app, values, chosen } = options
  const base = bodyOf(app, runValues(values))
  const parsed = runInputs.safeParse(
    chosen === null
      ? base.inputs
      : { ...base.inputs, [modelInputName]: chosen.id }
  )
  if (!parsed.success) {
    return null
  }
  const inputs = parsed.data
  if (chosen === null || chosen.form === null) {
    return { inputs, aspectRatio: base.aspectRatio ?? null, hosted: null }
  }
  return {
    inputs,
    aspectRatio: null,
    hosted: hostedOf(values, chosen.form, options.photos),
  }
}

function priceAskOf(call: KeyframeCall | undefined): PriceAsk | null {
  if (call === undefined) {
    return null
  }
  const { inputs, aspectRatio } = call.request
  return aspectRatio === null ? { inputs } : { inputs, aspectRatio }
}

export function priceAsksOf(ask: StoryboardAsk | null): PriceAsks {
  const calls = ask === null ? [] : keyframeCallsOf(ask)
  const edits = calls.filter((call) => call.kind === "edit")
  return {
    text: priceAskOf(calls.find((call) => call.kind === "text")),
    edit: priceAskOf(edits[0]),
    edits: edits.length,
  }
}

function creditsOf(price: Price): number | null {
  return price === undefined || price.credits === null || price.credits <= 0
    ? null
    : price.credits
}

export function callsCredits(
  parts: readonly { price: Price; calls: number }[]
): number | null {
  let total = 0
  for (const part of parts.filter((one) => one.calls > 0)) {
    const credits = creditsOf(part.price)
    if (credits === null) {
      return null
    }
    total += credits * part.calls
  }
  return total > 0 ? Math.round(total * 100) / 100 : null
}
