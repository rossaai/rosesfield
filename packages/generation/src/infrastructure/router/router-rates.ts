import type { RunInputs } from "@rosesfield/contract"
import type { ModelForm } from "#domain/model-form"
import {
  arrayOf,
  fieldOf,
  numberOf,
  stringOf,
} from "#infrastructure/router/router-json"

export type RateRow = {
  model: string
  credits: number
  unit: string
  conditions: string
}

type Values = Map<string, string>

const countKeys: readonly string[] = [
  "n",
  "numimages",
  "samplecount",
  "count",
  "numoutputs",
  "numberofimages",
]

const durationKeys: readonly string[] = [
  "duration",
  "durationseconds",
  "seconds",
  "length",
]

const perOutput =
  /^per (request|generation|image|output image|generated image|completed operation)$/

export function rateRowsOf(snapshot: unknown): RateRow[] {
  return (arrayOf(fieldOf(snapshot, "rates")) ?? []).flatMap((row) => {
    const model = stringOf(fieldOf(row, "model_id"))
    const credits = numberOf(fieldOf(row, "credits"))
    const unit = stringOf(fieldOf(row, "unit"))
    if (model === null || credits === null || unit === null) {
      return []
    }
    return [
      {
        model,
        credits,
        unit,
        conditions: stringOf(fieldOf(row, "conditions")) ?? "",
      },
    ]
  })
}

export function priceFromRates(
  rows: readonly RateRow[],
  form: ModelForm,
  inputs: RunInputs
): number | null {
  const values = valuesOf(form, inputs)
  const scored = rows
    .filter((row) => row.model === form.model && isPriced(row.unit))
    .map((row) => ({ row, score: scoreOf(row.conditions, values, inputs) }))
    .filter((one) => one.score !== null)
  const best = Math.max(...scored.map((one) => one.score ?? 0))
  const top = scored.filter((one) => one.score === best)
  const prices = new Set(top.map((one) => amountOf(one.row, values)))
  const [only] = [...prices]
  return prices.size === 1 && only !== undefined && only !== null
    ? Math.round(only * 100) / 100
    : null
}

function isPriced(unit: string): boolean {
  return (
    perOutput.test(unit) || unit === "per second" || unit === "per 5 seconds"
  )
}

function amountOf(row: RateRow, values: Values): number | null {
  const count = numberIn(values, countKeys) ?? 1
  if (perOutput.test(row.unit)) {
    return row.credits * count
  }
  const seconds = numberIn(values, durationKeys) ?? secondsIn(row.conditions)
  if (seconds === null) {
    return null
  }
  const units = row.unit === "per 5 seconds" ? Math.ceil(seconds / 5) : seconds
  return row.credits * units * count
}

function scoreOf(
  conditions: string,
  values: Values,
  inputs: RunInputs
): number | null {
  let score = 0
  for (const raw of conditions.split(";")) {
    const part = raw.trim()
    if (part === "") {
      continue
    }
    if (fitOf(part, values, inputs) !== true) {
      return null
    }
    score += 1
  }
  return score
}

function fitOf(
  part: string,
  values: Values,
  inputs: RunInputs
): boolean | null {
  const pair = /^([A-Za-z_ ]+)=(.+)$/.exec(part)
  if (pair !== null) {
    const held = values.get(keyOf(pair[1] ?? ""))
    return held === undefined ? null : held === keyOf(pair[2] ?? "")
  }
  const seconds = /^(\d+)s$/.exec(part)
  if (seconds !== null) {
    const held = numberIn(values, durationKeys)
    return held === null ? null : held === Number(seconds[1])
  }
  if (/^\d+p$/.test(part)) {
    const held = values.get("resolution")
    return held === undefined ? null : held === keyOf(part)
  }
  const hasMedia = Object.values(inputs).some(
    (value) => Array.isArray(value) && value.length > 0
  )
  if (/^(text[ -]to[ -](image|video))$/i.test(part)) {
    return !hasMedia
  }
  if (/^(edit|image[ -]to[ -]video)$/i.test(part)) {
    return hasMedia
  }
  return null
}

function valuesOf(form: ModelForm, inputs: RunInputs): Values {
  const values: Values = new Map()
  for (const field of form.fields) {
    const given = inputs[field.name]
    const chosen =
      given !== undefined && !Array.isArray(given)
        ? given
        : "default" in field
          ? field.default
          : null
    const value =
      field.kind === "toggle" && typeof chosen === "string"
        ? String(chosen === "on")
        : chosen
    const key = keyOf(field.path.split(".").at(-1) ?? field.name)
    if (value !== null && value !== undefined && !values.has(key)) {
      values.set(key, keyOf(String(value)))
    }
  }
  return values
}

function numberIn(values: Values, keys: readonly string[]): number | null {
  for (const key of keys) {
    const held = Number.parseFloat(values.get(key) ?? "")
    if (Number.isFinite(held)) {
      return held
    }
  }
  return null
}

function secondsIn(conditions: string): number | null {
  const found = /(?:^|;\s*)(\d+)s(?:;|$)/.exec(conditions)
  return found === null ? null : Number(found[1])
}

function keyOf(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9.]/g, "")
}
