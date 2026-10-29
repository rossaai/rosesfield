import type { AppDefinition, RunInputs } from "@rosesfield/contract"
import { motionCopy } from "#motion/copy.en"
import { exampleInput, ownVideo } from "#motion/examples/example-binding"
import { exampleKeyOf } from "#motion/examples/library-examples"
import { motionAppId } from "#motion/motion-models"

export const draftResolution = "480p"

const copy: Readonly<Record<string, string>> = motionCopy

function wordsOf(key: string): string {
  return copy[key] ?? key
}

function isExampleRun(inputs: RunInputs): boolean {
  const example = inputs[exampleInput]
  return typeof example === "string" && example !== ownVideo
}

export function isFinalRun(appId: string, inputs: RunInputs): boolean {
  if (appId !== motionAppId || !isExampleRun(inputs)) {
    return false
  }
  return inputs.resolution !== draftResolution
}

export function exampleAgentNotes(app: AppDefinition): string {
  const choice = app.inputs.find((input) => input.name === exampleInput)
  const options = choice?.type === "choice" ? choice.options : []
  const needs = options
    .filter((option) => option.value !== ownVideo)
    .map((option) =>
      wordsOf("motion.agent.need")
        .replace("{example}", option.value)
        .replace(
          "{need}",
          wordsOf(`motion.example.${exampleKeyOf(option.value)}.photo`)
        )
    )
  return needs.length === 0
    ? ""
    : [wordsOf("motion.agent.howTo"), ...needs].join("\n")
}
