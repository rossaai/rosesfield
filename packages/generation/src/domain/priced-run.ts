import type {
  AppDefinition,
  InputDefinition,
  InputValue,
  RunInputs,
} from "@rosesfield/contract"
import type { ModelField, ModelForm } from "#domain/model-form"
import { resolveBinding } from "#domain/select-binding"
import { chosenModelOf, hostedModelOf } from "#domain/task-binding"

export type PricedRun = {
  model: string
  settings: string
}

export type PricedRunOptions = {
  app: AppDefinition
  inputs: RunInputs
  form: ModelForm | null
  count: number
  aspectRatio: string | null
}

type Setting = string | number | boolean | null

export function pricedRunOf(options: PricedRunOptions): PricedRun {
  const { app, inputs, form } = options
  const chosen = chosenModelOf(app.engine, inputs)
  const model =
    chosen ??
    hostedModelOf(resolveBinding(app.engine, inputs)) ??
    `app:${app.id}`
  const settings: [string, Setting][] = [
    ["count", options.count],
    ["aspectRatio", options.aspectRatio],
    ...(form === null
      ? app.inputs.flatMap((input) => appSettingOf(input, inputs))
      : form.fields.flatMap((field) => formSettingOf(field, inputs))),
  ]
  settings.sort(([one], [other]) => one.localeCompare(other))
  return { model, settings: JSON.stringify(settings) }
}

function formSettingOf(
  field: ModelField,
  inputs: RunInputs
): [string, Setting][] {
  const value = inputs[field.name]
  if (field.kind === "prompt" || /seed/i.test(field.name)) {
    return []
  }
  return field.kind === "media"
    ? [[field.name, Array.isArray(value) ? value.length : 0]]
    : [[field.name, settingOf(value) ?? field.default]]
}

function appSettingOf(
  input: InputDefinition,
  inputs: RunInputs
): [string, Setting][] {
  const value = inputs[input.name]
  switch (input.type) {
    case "prompt":
    case "seed":
      return []
    case "image":
    case "video":
    case "audio":
    case "character":
      return [[input.name, Array.isArray(value) ? value.length : 0]]
    default:
      return [[input.name, settingOf(value) ?? input.default]]
  }
}

function settingOf(value: InputValue | undefined): Setting {
  return value === undefined || Array.isArray(value) ? null : value
}
