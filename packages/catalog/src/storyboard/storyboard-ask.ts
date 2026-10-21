import {
  type AppDefinition,
  type RunRequest,
  runInputs,
  startRunBodyFor,
} from "@rosesfield/contract"
import { fieldRoleOf, type ModelField } from "@rosesfield/generation/bindings"
import type { z } from "zod"
import type { HostedAsk, StoryboardAsk } from "#storyboard/storyboard-chain"
import {
  firstKeyframeInput,
  keyframeInput,
} from "#storyboard/storyboard-inputs"

type Values = Readonly<Record<string, unknown>>

export type HostedValues = {
  form: readonly ModelField[]
  values: Values
  photos: HostedAsk["photos"]
}

const output = "image"

const ownRoles: readonly string[] = ["prompt", "seed", "count", "reference"]

const chainInputs: readonly string[] = [keyframeInput, firstKeyframeInput]

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

function settingsOf(
  form: readonly ModelField[],
  values: Values
): HostedAsk["settings"] {
  const settings: Record<string, string | number> = {}
  for (const field of settingFieldsOf(form)) {
    const value = values[field.name]
    const isSet =
      typeof value === "number" || (typeof value === "string" && value !== "")
    if (isSet) {
      settings[field.name] = value
    }
  }
  return settings
}

export function storyboardAskOf(options: {
  inputs: Values
  aspectRatio: string | null
  hosted: HostedValues | null
}): StoryboardAsk | null {
  const parsed = runInputs.safeParse(options.inputs)
  if (!parsed.success) {
    return null
  }
  const { hosted } = options
  if (hosted === null) {
    return {
      inputs: parsed.data,
      aspectRatio: options.aspectRatio,
      hosted: null,
    }
  }
  return {
    inputs: parsed.data,
    aspectRatio: null,
    hosted: {
      form: hosted.form,
      settings: settingsOf(hosted.form, hosted.values),
      photos: hosted.photos,
    },
  }
}

export function storyboardBodyFor(app: AppDefinition): z.ZodType<RunRequest> {
  return startRunBodyFor({
    ...app,
    inputs: app.inputs.filter((input) => !chainInputs.includes(input.name)),
    output: { ...app.output, count: { default: 1, max: 1 } },
  })
}
