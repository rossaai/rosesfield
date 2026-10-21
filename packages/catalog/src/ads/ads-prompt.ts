import type { Run } from "@rosesfield/contract"
import {
  fieldOfRole,
  isHostedModelId,
  type ModelField,
} from "@rosesfield/generation/bindings"
import {
  adsAppId,
  defaultKind,
  defaultStyle,
  kindValues,
  styleValues,
} from "#ads/ads-values"
import {
  keepRule,
  kindLeads,
  lineBreakPattern,
  lineLeads,
  linkPattern,
  personRule,
  quoteCleanups,
  stylePhrases,
  wordsEnd,
  wordsLeads,
} from "#ads/comfy/ads-prompts"

type AdsInputs = Readonly<Record<string, unknown>>

export type AdsRun = Pick<Run, "appId" | "inputs">

function oneOf<Value extends string>(
  values: readonly Value[],
  given: unknown,
  fallback: Value
): Value {
  return values.find((value) => value === given) ?? fallback
}

function fieldOf(value: unknown): string {
  return typeof value === "string"
    ? value.replace(new RegExp(linkPattern, "gi"), "").trim()
    : ""
}

function isFilled(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

export function adsPromptOf(inputs: AdsInputs): string {
  const kind = oneOf(kindValues, inputs.kind, defaultKind)
  const style = oneOf(styleValues, inputs.style, defaultStyle)
  const words = fieldOf(kind === "ad" ? inputs.headline : inputs.scene)
  const line = fieldOf(inputs.line)
  const keep = isFilled(inputs.character)
    ? `${keepRule}${personRule}`
    : keepRule
  return [
    kindLeads[kind],
    stylePhrases[style],
    wordsLeads[kind],
    words,
    line === "" ? "" : `${lineLeads[kind]}${line}`,
    wordsEnd,
    keep,
  ]
    .join("")
    .replace(new RegExp(quoteCleanups[kind], "gi"), "")
    .replace(new RegExp(lineBreakPattern, "gi"), " ")
    .replaceAll("  ", " ")
    .trim()
}

const modelInput = "model"

function sentPromptOf(
  run: AdsRun,
  fields: readonly ModelField[] | null
): string | null {
  const field = fieldOfRole(fields ?? [], "prompt", "image")
  const sent = field === null ? undefined : run.inputs[field.name]
  return typeof sent === "string" ? sent : null
}

export function adsRunPromptOf(
  run: AdsRun,
  fields: readonly ModelField[] | null
): string | null {
  if (run.appId !== adsAppId) {
    return null
  }
  const model = run.inputs[modelInput]
  return typeof model === "string" && isHostedModelId(model)
    ? sentPromptOf(run, fields)
    : adsPromptOf(run.inputs)
}
