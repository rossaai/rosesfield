import type { AppDefinition, Run, RunInputs } from "@rosesfield/contract"
import { tasksOf } from "@rosesfield/generation/bindings"
import { defaultModelOf } from "#comfy/list-models"

export const speechTask = "speech"

const audioInput = "audio"

export function speechAppOf(
  apps: readonly AppDefinition[]
): AppDefinition | null {
  return apps.find((app) => tasksOf(app.engine).includes(speechTask)) ?? null
}

export function speechDefaultOf(apps: readonly AppDefinition[]): string | null {
  const app = speechAppOf(apps)
  return app === null ? null : defaultModelOf(app)
}

export function spokenInputs(inputs: RunInputs, speech: Run): RunInputs | null {
  const [made] = speech.outputs
  return speech.status !== "done" || made === undefined
    ? null
    : { ...inputs, [audioInput]: [made] }
}
