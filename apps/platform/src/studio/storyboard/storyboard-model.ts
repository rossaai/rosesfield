import {
  type CatalogModel,
  fieldRoleOf,
  type ModelField,
  type PriceResponse,
} from "@rosesfield/catalog/comfy"
import {
  storyboardAskOf as askOf,
  editTask,
  type HostedAsk,
  type KeyframeCall,
  keyframeCallsOf,
  type StoryboardAsk,
  settingFieldsOf,
} from "@rosesfield/catalog/storyboard"
import type { AppListing } from "@rosesfield/contract"
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

export function storyboardAskOf(options: {
  app: AppListing
  values: FormValues
  chosen: CatalogModel | null
  photos: HostedAsk["photos"]
}): StoryboardAsk | null {
  const { app, values, chosen } = options
  const base = bodyOf(app, runValues(values))
  return askOf({
    inputs:
      chosen === null
        ? base.inputs
        : { ...base.inputs, [modelInputName]: chosen.id },
    aspectRatio: base.aspectRatio ?? null,
    hosted:
      chosen === null || chosen.form === null
        ? null
        : { form: chosen.form, values: values.inputs, photos: options.photos },
  })
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
