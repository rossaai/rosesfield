import { findApp } from "@rosesfield/catalog"
import {
  cameraWordsKeyOf,
  cameraWordsSeparator,
} from "@rosesfield/catalog/video"
import { tCatalog } from "@/copy/t"

export type Preset = {
  value: string
  labelKey: string
  words: string
}

const autoMove = "auto"

export function presetsOf(appId: string): Preset[] {
  const input = findApp(appId)?.inputs.find(
    (one) => one.name === "cameraMove" && one.type === "choice"
  )
  if (input?.type !== "choice") {
    return []
  }
  return input.options
    .filter((option) => option.value !== autoMove)
    .map((option) => ({
      value: option.value,
      labelKey: option.labelKey,
      words: tCatalog(cameraWordsKeyOf(option.value)),
    }))
}

export type SplitPrompt = {
  typed: string
  move: string | null
}

export function composePrompt(
  typed: string,
  move: string | null,
  presets: readonly Preset[]
): string {
  const preset = presets.find((one) => one.value === move)
  return preset === undefined
    ? typed
    : `${typed}${cameraWordsSeparator}${preset.words}`
}

export function splitPrompt(
  prompt: string,
  presets: readonly Preset[]
): SplitPrompt {
  const preset = presets.find((one) =>
    prompt.endsWith(`${cameraWordsSeparator}${one.words}`)
  )
  return preset === undefined
    ? { typed: prompt, move: null }
    : {
        typed: prompt.slice(
          0,
          prompt.length - preset.words.length - cameraWordsSeparator.length
        ),
        move: preset.value,
      }
}

export function typedPrompt(
  current: string,
  typed: string,
  presets: readonly Preset[]
): string {
  const own = splitPrompt(typed, presets)
  return own.move === null
    ? composePrompt(typed, splitPrompt(current, presets).move, presets)
    : typed
}

export function movedPrompt(
  prompt: string,
  cameraMove: unknown,
  presets: readonly Preset[]
): string {
  const split = splitPrompt(prompt, presets)
  return split.move === null && typeof cameraMove === "string"
    ? composePrompt(prompt, cameraMove, presets)
    : prompt
}
