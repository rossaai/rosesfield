import { adsHostedInputsOf } from "@rosesfield/catalog/ads"
import type { ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, isAppOnly } from "@rosesfield/contract"
import {
  bodyOf,
  type FieldValue,
  type FormValues,
  type StartRunBodyInput,
} from "@/screens/app/app-form"
import { hostedDefaults } from "@/screens/app/hosted/hosted-form"
import { bodyAppFor } from "@/studio/ads/ads-rules"

type BodyValue = StartRunBodyInput["inputs"][string]

function filledOf(
  inputs: Readonly<Record<string, FieldValue>>
): Record<string, BodyValue> {
  return Object.fromEntries(
    Object.entries(inputs).filter(
      (entry): entry is [string, BodyValue] =>
        entry[1] !== undefined &&
        entry[1] !== "" &&
        !(Array.isArray(entry[1]) && entry[1].length === 0)
    )
  )
}

export function adsHostedBodyOf(
  app: AppListing,
  values: FormValues,
  fields: readonly ModelField[],
  characterPhoto: string | null,
  own: StartRunBodyInput
): StartRunBodyInput {
  const sent = bodyAppFor(app, values.inputs)
  const appOnly = bodyOf(
    { ...sent, inputs: sent.inputs.filter(isAppOnly) },
    values
  ).inputs
  const filled = adsHostedInputsOf({
    inputs: values.inputs,
    fields,
    characterPhoto,
    aspectRatio: values.aspectRatio,
    count: values.count,
  })
  return {
    ...own,
    inputs: {
      ...filledOf(hostedDefaults(fields, {})),
      ...own.inputs,
      ...filled,
      ...filledOf(appOnly),
    },
  }
}
