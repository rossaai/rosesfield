import type { FieldValue } from "@/screens/app/app-form"
import {
  autoValue,
  keyOf,
  type ShotChoices,
  type ShotList,
  sentWords,
  shotListOrder,
  shotLists,
  shotPhrases,
} from "../../../../../packages/catalog/src/shot/shot-words"

export const sceneInput = "scene"

export const graphPromptInput = "prompt"

type Inputs = Readonly<Record<string, FieldValue>>

export type ShotScene = {
  scene: string
  choices: Record<ShotList, string>
}

export function choiceKeyOf(list: ShotList, value: string): string {
  return value === autoValue
    ? "choice.auto"
    : `shot.choice.${list}.${keyOf(value)}`
}

export function choiceValuesOf(list: ShotList): readonly string[] {
  return [autoValue, ...shotLists[list]]
}

function isChoiceOf(list: ShotList, value: unknown): value is string {
  return choiceValuesOf(list).some((one) => one === value)
}

export function choicesOf(inputs: Inputs): Record<ShotList, string> {
  const pick = (list: ShotList): string => {
    const value = inputs[list]
    return isChoiceOf(list, value) ? value : autoValue
  }
  return {
    movement: pick("movement"),
    camera: pick("camera"),
    lens: pick("lens"),
    focus: pick("focus"),
    light: pick("light"),
    color: pick("color"),
    mood: pick("mood"),
  }
}

export function wordsOf(scene: string, choices: ShotChoices): string {
  if (scene.trim() === "") {
    return ""
  }
  return sentWords({ scene, choices })
}

function phraseAtEnd(
  list: ShotList,
  text: string
): { value: string; rest: string } | null {
  for (const value of shotLists[list]) {
    const phrase = ` ${shotPhrases[list][value] ?? ""}`
    if (phrase.trim() !== "" && text.endsWith(phrase)) {
      return { value, rest: text.slice(0, text.length - phrase.length) }
    }
  }
  return null
}

export function splitWords(prompt: string): ShotScene {
  const choices = choicesOf({})
  let rest = prompt
  for (const list of [...shotListOrder].reverse()) {
    const found = phraseAtEnd(list, rest)
    if (found !== null) {
      choices[list] = found.value
      rest = found.rest
    }
  }
  return { scene: rest, choices }
}

export function sceneOf(inputs: Inputs, promptName: string): ShotScene {
  const scene = inputs[sceneInput]
  if (typeof scene === "string") {
    return { scene, choices: choicesOf(inputs) }
  }
  const prompt = inputs[promptName]
  return splitWords(typeof prompt === "string" ? prompt : "")
}

export function shotInputsOf(shot: ShotScene): Record<string, string> {
  return { [sceneInput]: shot.scene, ...shot.choices }
}
