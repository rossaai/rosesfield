import type {
  AppDefinition,
  InputDefinition,
  Run,
  RunInputs,
} from "@rosesfield/contract"
import { tasksOf } from "@rosesfield/generation/bindings"
import { defaultModelOf } from "#comfy/list-models"

export const speechTask = "speech"

const audioInput = "audio"

const modelInput = "model"

export type SpeechRun = {
  appId: string
  inputs: RunInputs
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

export function speechRunOf(
  apps: readonly AppDefinition[],
  text: string,
  voice: string | null
): SpeechRun | null {
  const app = speechAppOf(apps)
  const script = app?.inputs.find(
    (input): input is Extract<InputDefinition, { type: "prompt" }> =>
      input.type === "prompt"
  )
  const model = voice ?? (app === null ? null : defaultModelOf(app))
  if (app === null || script === undefined || model === null) {
    return null
  }
  const line = text.trim()
  return line === "" || line.length > script.maxLength
    ? null
    : { appId: app.id, inputs: { [modelInput]: model, [script.name]: line } }
}

export function spokenInputs(inputs: RunInputs, speech: Run): RunInputs | null {
  const [made] = speech.outputs
  return speech.status !== "done" || made === undefined
    ? null
    : { ...inputs, [audioInput]: [made] }
}
