import type { RunInputs } from "@rosesfield/contract"
import { type FieldRole, fieldOfRole, isOneAtATime } from "#domain/field-role"
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

type Fit = "holds" | "names-output" | null

type RunFacts = {
  values: Values
  inputs: RunInputs
  seconds: number | null
}

const outputSizeKey = "outputsize"

const output =
  /^(output (image|video)( duration)?|(image|video) generation|generated image|generation|completed output duration)$/i

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
  inputs: RunInputs,
  output: string,
  count = 1
): number | null {
  const own = rows.filter(
    (row) => row.model === form.model && isPriced(row.unit)
  )
  const values = valuesOf(form, inputs)
  const run: RunFacts = {
    values,
    inputs,
    seconds:
      roleNumber(form, inputs, "length") ?? numberIn(values, ["duration"]),
  }
  const scored = own
    .map((row) => ({ row, score: scoreOf(row.conditions, run) }))
    .filter((one) => one.score !== null)
  const best = Math.max(...scored.map((one) => one.score ?? 0))
  const top = scored.filter((one) => one.score === best)
  const each = isOneAtATime(form.fields, output) ? count : 1
  const prices = new Set(
    top.map((one) => amountOf(one.row, form, inputs, values))
  )
  const [only] = [...prices]
  return prices.size === 1 && only !== undefined && only !== null
    ? Math.round(only * each * 100) / 100
    : null
}

function isPriced(unit: string): boolean {
  return (
    perOutput.test(unit) || unit === "per second" || unit === "per 5 seconds"
  )
}

function amountOf(
  row: RateRow,
  form: ModelForm,
  inputs: RunInputs,
  values: Values
): number | null {
  const count = roleNumber(form, inputs, "count") ?? 1
  if (perOutput.test(row.unit)) {
    return row.credits * count
  }
  const seconds =
    roleNumber(form, inputs, "length") ??
    numberIn(values, ["duration"]) ??
    secondsIn(row.conditions)
  if (seconds === null) {
    return null
  }
  const units = row.unit === "per 5 seconds" ? Math.ceil(seconds / 5) : seconds
  return row.credits * units * count
}

function scoreOf(conditions: string, run: RunFacts): number | null {
  let score = 0
  for (const raw of conditions.split(";")) {
    const part = raw.trim()
    if (part === "") {
      continue
    }
    const fit = fitOf(part, run)
    if (fit === null) {
      return null
    }
    score += fit === "holds" ? 1 : 0
  }
  return score
}

function fitOf(part: string, run: RunFacts): Fit {
  const { values, inputs } = run
  if (output.test(part)) {
    return "names-output"
  }
  const pair = /^([A-Za-z_ ]+)=(.+)$/.exec(part)
  if (pair !== null) {
    const held = values.get(keyOf(pair[1] ?? ""))
    return held !== undefined && held === keyOf(pair[2] ?? "") ? "holds" : null
  }
  const seconds = /^(\d+)s$/.exec(part)
  if (seconds !== null) {
    return run.seconds === Number(seconds[1]) ? "holds" : null
  }
  if (/^\d+p$/.test(part)) {
    return values.get("resolution") === keyOf(part) ? "holds" : null
  }
  const hasMedia = Object.values(inputs).some(
    (value) => Array.isArray(value) && value.length > 0
  )
  if (/^(text[ -]to[ -](image|video))$/i.test(part)) {
    return hasMedia ? null : "holds"
  }
  if (/^(edit|image[ -]to[ -]video)$/i.test(part)) {
    return hasMedia ? "holds" : null
  }
  return null
}

function valuesOf(form: ModelForm, inputs: RunInputs): Values {
  const values: Values = new Map()
  for (const field of form.fields) {
    const chosen = chosenOf(field.name, inputs, field)
    const value =
      field.kind === "toggle" && typeof chosen === "string"
        ? String(chosen === "on")
        : chosen
    const key = keyOf(field.path.split(".").at(-1) ?? field.name)
    if (value !== null && value !== undefined && !values.has(key)) {
      values.set(key, keyOf(String(value)))
    }
  }
  const size = outputSizeOf(form, inputs)
  if (size !== null && !values.has(outputSizeKey)) {
    values.set(outputSizeKey, size)
  }
  return values
}

function chosenOf(
  name: string,
  inputs: RunInputs,
  field: ModelForm["fields"][number]
): string | number | boolean | null {
  const given = inputs[name]
  if (given !== undefined && !Array.isArray(given)) {
    return given
  }
  return "default" in field ? field.default : null
}

function outputSizeOf(form: ModelForm, inputs: RunInputs): string | null {
  const field = fieldOfRole(form.fields, "resolution", "image")
  const value = field === null ? null : chosenOf(field.name, inputs, field)
  return value === null ? null : sizeClassOf(String(value))
}

function sizeClassOf(value: string): string | null {
  const text = value.toLowerCase().trim()
  if (/^\d+(\.\d+)?k$/.test(text)) {
    return text
  }
  const sized = /^(\d+)\s*[x*]\s*(\d+)$/.exec(text)
  if (sized === null) {
    return null
  }
  const long = Math.max(Number(sized[1]), Number(sized[2]))
  if (long <= 1536) {
    return "1k"
  }
  return long <= 2560 ? "2k" : "4k"
}

function roleNumber(
  form: ModelForm,
  inputs: RunInputs,
  role: FieldRole
): number | null {
  const field = fieldOfRole(form.fields, role, "video")
  if (field === null) {
    return null
  }
  const value = Number.parseFloat(String(chosenOf(field.name, inputs, field)))
  return Number.isFinite(value) ? value : null
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
