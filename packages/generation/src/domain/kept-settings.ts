import type { InputValue, RunInputs } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import type { ModelForm } from "#domain/model-form"

export type KeptSetting = readonly [string, string | number | boolean | null]

export type KeptRun<Cost> = {
  settings: string
  cost: Cost
}

export function keptSettingsOf(settings: string): KeptSetting[] {
  try {
    const parsed: unknown = JSON.parse(settings)
    return Array.isArray(parsed) ? parsed.filter(isSetting) : []
  } catch {
    return []
  }
}

function isSetting(value: unknown): value is KeptSetting {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    (value[1] === null ||
      ["string", "number", "boolean"].includes(typeof value[1]))
  )
}

function differencesOf(asked: string, kept: string): number {
  const one = keptSettingsOf(asked).map((pair) => JSON.stringify(pair))
  const other = keptSettingsOf(kept).map((pair) => JSON.stringify(pair))
  const left = new Set(one)
  const right = new Set(other)
  return (
    one.filter((pair) => !right.has(pair)).length +
    other.filter((pair) => !left.has(pair)).length
  )
}

export function nearestKeptOf<Cost>(
  asked: string,
  kept: readonly KeptRun<Cost>[]
): KeptRun<Cost> | null {
  let nearest: KeptRun<Cost> | null = null
  let fewest = Number.POSITIVE_INFINITY
  for (const run of kept) {
    const differences = differencesOf(asked, run.settings)
    if (differences < fewest) {
      nearest = run
      fewest = differences
    }
  }
  return nearest
}

export function keptCountOf(settings: string): number {
  const count = keptSettingsOf(settings).find(([name]) => name === "count")?.[1]
  return typeof count === "number" && count > 0 ? count : 1
}

export function inputsOfKept(
  form: ModelForm,
  settings: string,
  asked: RunInputs
): RunInputs {
  const pairs = keptSettingsOf(settings)
  const inputs: Record<string, InputValue> = { ...asked }
  for (const field of form.fields) {
    const value = pairs
      .filter(([name, held]) => name === field.name && held !== null)
      .at(-1)?.[1]
    if (field.kind === "media") {
      const count = typeof value === "number" ? value : 0
      if (count > 0) {
        inputs[field.name] = Array.from({ length: count }, () =>
          assetIdFormat.parse(crypto.randomUUID())
        )
      } else {
        delete inputs[field.name]
      }
      continue
    }
    if (field.kind === "prompt") {
      continue
    }
    if (typeof value === "string" || typeof value === "number") {
      inputs[field.name] = value
    } else {
      delete inputs[field.name]
    }
  }
  return inputs
}
