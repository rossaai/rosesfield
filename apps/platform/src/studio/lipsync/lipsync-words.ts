import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { FieldProblem, FormValues } from "@/screens/app/app-form"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import {
  hostedProblems,
  modelInputName,
} from "@/screens/app/hosted/hosted-form"
import type { PriceAsk } from "@/screens/app/hosted/model-catalog-query"
import {
  faceOf,
  type LipFields,
  type LipsyncTab,
} from "@/studio/lipsync/lipsync-tabs"

export type WordsMode = "audio" | "text"

export const wordsModes: readonly WordsMode[] = ["audio", "text"]

export const wordsLabelKey = "lipsync.input.words.label"

export const speechModelInput = "speechModel"

export const speechTextInput = "speechText"

export const speechTextMax = 2000

export type WordsPlan = {
  mode: WordsMode
  isChain: boolean
  field: string | null
}

export function modesOf(fields: LipFields | null): WordsMode[] {
  return fields?.audio === null ? ["text"] : [...wordsModes]
}

export function planOf(mode: WordsMode, fields: LipFields | null): WordsPlan {
  const shown = modesOf(fields).includes(mode) ? mode : "text"
  if (shown === "audio") {
    return { mode: shown, isChain: false, field: fields?.audio?.name ?? null }
  }
  const direct = fields?.text ?? null
  return direct === null
    ? { mode: shown, isChain: true, field: speechTextInput }
    : { mode: shown, isChain: false, field: direct.name }
}

export function speechFieldsOf(voices: readonly string[]): ModelField[] {
  return [
    {
      kind: "text",
      name: speechTextInput,
      path: speechTextInput,
      required: true,
      maxLength: speechTextMax,
      default: null,
    },
    {
      kind: "choice",
      name: speechModelInput,
      path: speechModelInput,
      required: true,
      options: voices.length === 0 ? [""] : [...voices],
      default: voices[0] ?? null,
    },
  ]
}

function droppedOf(
  fields: LipFields,
  tab: LipsyncTab,
  plan: WordsPlan
): Set<string> {
  const other = faceOf(fields, tab === "photo" ? "clip" : "photo")
  const face = faceOf(fields, tab)
  const dropped = new Set<string>()
  if (other !== null && other.name !== face?.name) {
    dropped.add(other.name)
  }
  if (plan.mode === "text" && fields.audio !== null) {
    dropped.add(fields.audio.name)
  }
  if (plan.mode === "audio" && fields.text !== null) {
    dropped.add(fields.text.name)
  }
  return dropped
}

export function runFieldsOf(options: {
  fields: LipFields
  tab: LipsyncTab
  plan: WordsPlan
  voices: readonly string[]
}): ModelField[] {
  const dropped = droppedOf(options.fields, options.tab, options.plan)
  const kept = options.fields.all.filter((field) => !dropped.has(field.name))
  return options.plan.isChain
    ? [...kept, ...speechFieldsOf(options.voices)]
    : kept
}

function speechInputsOf(voices: readonly string[]): InputDefinition[] {
  return [
    {
      type: "prompt",
      name: speechTextInput,
      labelKey: "voice.input.script.label",
      presence: "required",
      maxLength: speechTextMax,
    },
    {
      type: "prompt",
      name: speechModelInput,
      labelKey: "voice.input.mode.label",
      presence: voices.length === 0 ? "optional" : "required",
      maxLength: 200,
    },
  ]
}

export function graphBodyAppOf(options: {
  app: AppListing
  fields: LipFields
  tab: LipsyncTab
  plan: WordsPlan
  voices: readonly string[]
}): AppListing {
  const dropped = droppedOf(options.fields, options.tab, options.plan)
  const inputs = options.app.inputs.filter((input) => !dropped.has(input.name))
  return {
    ...options.app,
    inputs: options.plan.isChain
      ? [...inputs, ...speechInputsOf(options.voices)]
      : inputs,
  }
}

export function wordsProblemOf(
  plan: WordsPlan,
  values: FormValues
): FieldProblem | null {
  if (plan.field === null) {
    return null
  }
  const value = values.inputs[plan.field]
  if (plan.mode === "audio") {
    return listOf(value).length === 0
      ? { name: plan.field, key: "field.asset.required", values: {} }
      : null
  }
  return textOf(value).trim() === ""
    ? { name: plan.field, key: "field.prompt.required", values: {} }
    : null
}

function faceProblemsOf(
  found: readonly FieldProblem[],
  face: string | null,
  values: FormValues
): FieldProblem[] {
  if (face === null) {
    return []
  }
  const own = found.filter((problem) => problem.name === face)
  const isEmpty = listOf(values.inputs[face]).length === 0
  return own.length > 0 || !isEmpty
    ? own
    : [{ name: face, key: "field.asset.required", values: {} }]
}

export function lipsyncProblems(options: {
  fields: readonly ModelField[]
  face: string | null
  plan: WordsPlan
  values: FormValues
}): FieldProblem[] {
  const { plan, values } = options
  const found = hostedProblems(options.fields, values)
  const words = wordsProblemOf(plan, values)
  const others = found.filter(
    (problem) => problem.name !== plan.field && problem.name !== options.face
  )
  const face = faceProblemsOf(found, options.face, values)
  const kept =
    words === null
      ? found.filter((problem) => problem.name === plan.field)
      : [words]
  return [...face, ...kept, ...others]
}

function textNameOf(voice: CatalogModel): string {
  const field = (voice.form ?? []).find(
    (one) => one.kind === "prompt" || one.kind === "text"
  )
  return field?.name ?? "prompt"
}

export function speechAskOf(
  voice: CatalogModel | null,
  text: string
): PriceAsk | null {
  if (voice === null || text.trim() === "") {
    return null
  }
  return { inputs: { [modelInputName]: voice.id, [textNameOf(voice)]: text } }
}

export function totalOf(
  lip: number | null,
  speech: number | null
): number | null {
  return lip === null || speech === null
    ? null
    : Math.round((lip + speech) * 100) / 100
}

export function wordsOfInputs(
  inputs: Readonly<Record<string, unknown>>,
  fields: LipFields | null
): WordsMode {
  const names = [speechTextInput, fields?.text?.name ?? speechTextInput]
  const audio = fields?.audio?.name
  const held = audio === undefined ? undefined : inputs[audio]
  const hasAudio = Array.isArray(held) && held.length > 0
  const hasText = names.some((name) => {
    const text = inputs[name]
    return typeof text === "string" && text !== ""
  })
  return hasText && !hasAudio ? "text" : "audio"
}
