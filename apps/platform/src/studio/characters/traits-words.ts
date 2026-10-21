import type { FieldValue } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import { traitFragments } from "../../../../../packages/catalog/src/characters/comfy/traits-prompt"
import { traitNames } from "../../../../../packages/catalog/src/characters/traits"

type Inputs = Readonly<Record<string, FieldValue>>

const hairOnly: ReadonlySet<string> = new Set(["hairStyle", "hairColor"])

const fallbackFraming = "half-body"

function fragmentOf(
  map: Readonly<Record<string, string>>,
  value: string
): string {
  return Object.hasOwn(map, value) ? (map[value] ?? "") : ""
}

export function traitsWords(inputs: Inputs): string {
  const { framing, traits, background, sourceReady } = traitFragments
  const isBald = textOf(inputs.hairLength) === "bald"
  const parts = [
    fragmentOf(framing, textOf(inputs.framing) || fallbackFraming),
    ...traitNames
      .filter((name) => !(isBald && hairOnly.has(name)))
      .map((name) => fragmentOf(traits[name], textOf(inputs[name]))),
    fragmentOf(background, textOf(inputs.plainBackground) || "on"),
    sourceReady,
  ]
  const details = textOf(inputs.details).trim()
  const sentence = parts.join("")
  return details === "" ? sentence : `${sentence}. ${details}`
}
