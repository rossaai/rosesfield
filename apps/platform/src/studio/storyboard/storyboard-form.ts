import type { AppListing, Run } from "@rosesfield/contract"
import { t, tCatalog } from "@/copy/t"
import {
  type FieldValue,
  type FormValues,
  valuesFromRun,
} from "@/screens/app/app-form"
import {
  lookMaxLength,
  maxScenes,
  sceneCountInput,
  sceneInputName,
  sceneMaxLength,
  sceneNumbers,
} from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

export const focusOrder: readonly string[] = [
  "reference",
  ...sceneNumbers.map(sceneInputName),
  "look",
]

function textOf(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function listOf(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function boundedCount(count: number): number {
  return Math.min(Math.max(count, 1), maxScenes)
}

export function scenesOf(values: FormValues): string[] {
  return sceneNumbers
    .slice(0, boundedCount(values.count))
    .map((number) => textOf(values.inputs[sceneInputName(number)]))
}

export function withScenes(
  values: FormValues,
  scenes: readonly string[]
): FormValues {
  const count = boundedCount(scenes.length)
  const inputs: Record<string, FieldValue> = {
    ...values.inputs,
    [sceneCountInput]: String(count),
  }
  for (const number of sceneNumbers) {
    inputs[sceneInputName(number)] = scenes[number - 1] ?? ""
  }
  return { ...values, inputs, count }
}

export function runValues(values: FormValues): FormValues {
  return withScenes(values, scenesOf(values))
}

function sceneCountOf(inputs: FormValues["inputs"], fallback: number): number {
  const count = Number(inputs[sceneCountInput])
  return Number.isInteger(count) && count >= 1 ? boundedCount(count) : fallback
}

export function storyboardValuesFromRun(
  app: AppListing,
  run: Run
): FormValues {
  const base = valuesFromRun(app, run)
  const inputs: Record<string, FieldValue> = { ...base.inputs }
  const seed = app.inputs.find((input) => input.type === "seed")
  const fixedSeed = run.seed
  if (seed !== undefined && fixedSeed !== null) {
    inputs[seed.name] = fixedSeed
  }
  const filled: FormValues = {
    ...base,
    inputs,
    seedMode: seed !== undefined && fixedSeed !== null ? "fixed" : "random",
    count: sceneCountOf(inputs, run.count),
    aspectRatio: run.aspectRatio ?? base.aspectRatio,
  }
  return withScenes(filled, scenesOf(filled))
}

export function messagesOf(
  values: FormValues,
  reference: string | null
): Map<string, string> {
  const messages = new Map<string, string>()
  const hasReference = listOf(values.inputs.reference).length > 0
  const hasCharacter = listOf(values.inputs.character).length > 0
  if (hasReference && hasCharacter) {
    messages.set("reference", tCatalog("storyboard.input.anchor.both"))
  } else if (reference !== null) {
    messages.set("reference", reference)
  }
  scenesOf(values).forEach((scene, index) => {
    const name = sceneInputName(index + 1)
    if (scene.trim() === "") {
      messages.set(name, t("field.prompt.required"))
    } else if (scene.length > sceneMaxLength) {
      messages.set(
        name,
        t("field.prompt.count", { count: scene.length, max: sceneMaxLength })
      )
    }
  })
  const look = textOf(values.inputs.look)
  if (look.length > lookMaxLength) {
    messages.set(
      "look",
      t("field.prompt.count", { count: look.length, max: lookMaxLength })
    )
  }
  return messages
}
