import type { AppDefinition, RunInputs } from "@rosesfield/contract"
import { effectsCopy } from "#effects/copy.en"
import { effectKeyOf } from "#effects/effect-recipes"

export const effectsAppId = "effects"

export const draftResolution = "480p"

const copy: Readonly<Record<string, string>> = effectsCopy

function wordsOf(key: string): string {
  return copy[key] ?? key
}

export function isFinalRun(appId: string, inputs: RunInputs): boolean {
  if (appId !== effectsAppId) {
    return false
  }
  const resolution = inputs.resolution
  return resolution !== undefined && resolution !== draftResolution
}

export function effectAgentNotes(app: AppDefinition): string {
  const effect = app.inputs.find((input) => input.name === "effect")
  const options = effect?.type === "choice" ? effect.options : []
  const needs = options.map((option) =>
    wordsOf("effects.agent.need")
      .replace("{effect}", option.value)
      .replace("{need}", wordsOf(`effects.photo.${effectKeyOf(option.value)}`))
  )
  return [wordsOf("effects.agent.howTo"), ...needs].join("\n")
}
