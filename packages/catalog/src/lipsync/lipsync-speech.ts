import type {
  AppDefinition,
  InputDefinition,
  Run,
  RunInputs,
} from "@rosesfield/contract"
import { type ModelField, tasksOf } from "@rosesfield/generation/bindings"
import { defaultModelOf } from "#comfy/list-models"
import type { CatalogModel } from "#comfy/model-catalog.contract"

export const speechTask = "speech"

const audioInput = "audio"

const modelInput = "model"

export type SpeechRun = {
  appId: string
  inputs: RunInputs
}

export type SpeechApp = Pick<AppDefinition, "id" | "inputs">

type TextField = {
  name: string
  maxLength: number | null
}

export function speechAppOf(
  apps: readonly AppDefinition[]
): AppDefinition | null {
  return apps.find((app) => tasksOf(app.engine).includes(speechTask)) ?? null
}

export function speechDefaultOf(apps: readonly AppDefinition[]): string | null {
  const app = speechAppOf(apps)
  return app === null ? null : defaultModelOf(app)
}

function graphTextOf(app: SpeechApp): TextField | null {
  const script = app.inputs.find(
    (input): input is Extract<InputDefinition, { type: "prompt" }> =>
      input.type === "prompt"
  )
  return script === undefined
    ? null
    : { name: script.name, maxLength: script.maxLength }
}

function hostedTextOf(form: readonly ModelField[]): TextField | null {
  const field = form.find(
    (one): one is Extract<ModelField, { kind: "prompt" | "text" }> =>
      one.kind === "prompt" || one.kind === "text"
  )
  return field === undefined
    ? null
    : { name: field.name, maxLength: field.maxLength }
}

function hostedDefaultsOf(form: readonly ModelField[]): RunInputs {
  const filled: Record<string, string | number> = {}
  for (const field of form) {
    const value = "default" in field ? field.default : null
    if (
      field.required &&
      (typeof value === "string" || typeof value === "number")
    ) {
      filled[field.name] = value
    }
  }
  return filled
}

export function speechInputsOf(options: {
  app: SpeechApp
  voice: CatalogModel | null
  model: string
  text: string
}): RunInputs | null {
  const form = options.voice?.kind === "hosted" ? options.voice.form : null
  const field = form === null ? graphTextOf(options.app) : hostedTextOf(form)
  const line = options.text.trim()
  if (
    field === null ||
    line === "" ||
    (field.maxLength !== null && line.length > field.maxLength)
  ) {
    return null
  }
  return {
    ...(form === null ? {} : hostedDefaultsOf(form)),
    [modelInput]: options.model,
    [field.name]: line,
  }
}

export function speechRunOf(
  apps: readonly AppDefinition[],
  text: string,
  voice: string | null
): SpeechRun | null {
  const app = speechAppOf(apps)
  const model = voice ?? (app === null ? null : defaultModelOf(app))
  if (app === null || model === null) {
    return null
  }
  const inputs = speechInputsOf({ app, voice: null, model, text })
  return inputs === null ? null : { appId: app.id, inputs }
}

export function spokenInputs(
  inputs: RunInputs,
  speech: Run,
  audio: string = audioInput
): RunInputs | null {
  const [made] = speech.outputs
  return speech.status !== "done" || made === undefined
    ? null
    : { ...inputs, [audio]: [made] }
}
