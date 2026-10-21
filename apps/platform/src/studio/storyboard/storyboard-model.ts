import {
  type CatalogModel,
  fieldRoleOf,
  type ModelField,
  type PriceResponse,
} from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import {
  bodyOf,
  type FieldValue,
  type FormValues,
  type StartRunBodyInput,
} from "@/screens/app/app-form"
import { hostedDefaults, modelInputName } from "@/screens/app/hosted/hosted-form"
import {
  runValues,
  scenesOf,
  withScenes,
} from "@/studio/storyboard/storyboard-form"

export type FormatField = Extract<ModelField, { kind: "choice" }>

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

function isEmpty(value: FieldValue): boolean {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
}

export function storyboardBody(
  app: AppListing,
  values: FormValues,
  chosen: CatalogModel | null
): StartRunBodyInput {
  const base = bodyOf(app, runValues(values))
  if (chosen === null) {
    return base
  }
  const inputs: Record<string, string | number | string[]> = {
    ...base.inputs,
    [modelInputName]: chosen.id,
  }
  if (chosen.form === null) {
    return { ...base, inputs }
  }
  for (const field of settingFieldsOf(chosen.form)) {
    const value = values.inputs[field.name]
    if (value !== undefined && !isEmpty(value)) {
      inputs[field.name] = value
    }
  }
  return base.count === undefined
    ? { inputs }
    : { inputs, count: base.count }
}

export function keyframeBody(
  app: AppListing,
  values: FormValues,
  chosen: CatalogModel | null
): StartRunBodyInput {
  const first = scenesOf(values).slice(0, 1)
  return storyboardBody(app, withScenes(values, first), chosen)
}

export function keyframesCredits(
  price: PriceResponse["price"] | undefined,
  scenes: number
): number | null {
  if (price === undefined || price.credits === null || price.credits <= 0) {
    return null
  }
  return Math.round(price.credits * scenes * 100) / 100
}
