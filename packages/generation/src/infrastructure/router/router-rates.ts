import type { RunInputs } from "@rosesfield/contract"
import { isOneAtATime } from "#domain/field-role"
import type { KnownPrice, PriceFrom } from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import {
  arrayOf,
  fieldOf,
  numberOf,
  stringOf,
} from "#infrastructure/router/router-json"
import {
  factsOf,
  filledRunsOf,
  namedKeysOf,
  type RateRow,
  roleNumber,
  scoreOf,
  type Values,
  valuesOf,
} from "#infrastructure/router/router-rate-match"
import {
  type Amounts,
  amountsOf,
  isPerInput,
  isPerTime,
  isPriced,
} from "#infrastructure/router/router-rate-units"

export type { RateRow } from "#infrastructure/router/router-rate-match"

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

type UsageTable = {
  source: string
  readOn: string
  models: readonly string[]
  credits: number
  surcharges: readonly Surcharge[]
  refuses: readonly Setting[]
}

type Setting = { key: string; values: readonly string[] }

type Surcharge = { credits: number; when: readonly Setting[] }

const usageCredit = "usage credit"

const usageTables: readonly UsageTable[] = [
  {
    source: "https://docs.meshy.ai/en/api/pricing",
    readOn: "2026-10-22",
    models: ["meshy/meshy-6", "meshy/meshy-7", "meshy/meshy-7.1"],
    credits: 20,
    surcharges: [
      {
        credits: 5,
        when: [{ key: "geometryresolution", values: ["2k", "4k"] }],
      },
    ],
    refuses: [{ key: "mode", values: ["refine"] }],
  },
]

export type RatePrice = {
  credits: number
  low: number | null
  exact: boolean
  perOutput: boolean
}

/**
 * Prices one run from the published rate card. Every setting a row names
 * that the run leaves unset with no default is read once per value it takes,
 * and the rows that still fit give the price, or the range from the lowest
 * to the highest when they disagree. A range, a converted token count or a
 * filled setting whose rows disagree is not exact.
 */
export function priceFromRates(
  rows: readonly RateRow[],
  form: ModelForm,
  inputs: RunInputs,
  output: string,
  count = 1
): RatePrice | null {
  const each = isOneAtATime(form.fields, output) ? count : 1
  const usage = usagePriceOf(rows, form.model, valuesOf(form, inputs))
  if (usage !== undefined) {
    return usage === null
      ? null
      : priceOf([usage * each], true, isOneAtATime(form.fields, output))
  }
  const own = rows.filter((row) => row.model === form.model && isPriced(row))
  const keys = namedKeysOf(
    form.model,
    own.map((row) => row.conditions)
  )
  const needsSeconds = own.some((row) => isPerTime(row.unit))
  const amounts = filledRunsOf(form, inputs, keys, needsSeconds).map((run) =>
    amountsOfRun(own, form, run)
  )
  const read = amounts.flatMap((one) => (one === null ? [] : [one]))
  if (read.length === 0) {
    return null
  }
  const credits = read.flatMap((one) =>
    one.credits.map((value) => value * each)
  )
  const hasInputs =
    rows.some((row) => row.model === form.model && isPerInput(row.unit)) &&
    hasMedia(inputs)
  return priceOf(credits, read.every((one) => one.exact) && !hasInputs, true)
}

/** Names a rate the card or a published table gave as a price: exact when it is the published price of these settings, else an estimate. */
export function knownPriceOf(rate: RatePrice, from: PriceFrom): KnownPrice {
  return {
    source: rate.exact ? "rates" : "estimate",
    credits: rate.credits,
    from,
    ...(rate.low === null ? {} : { low: rate.low }),
    ...(rate.perOutput ? { perOutput: true as const } : {}),
  }
}

export function priceOf(
  credits: readonly number[],
  exact: boolean,
  perOutput: boolean
): RatePrice {
  const high = centsOf(Math.max(...credits))
  const low = centsOf(Math.min(...credits))
  return {
    credits: high,
    low: low < high ? low : null,
    exact: exact && low === high,
    perOutput,
  }
}

function centsOf(credits: number): number {
  return Math.round(credits * 100) / 100
}

function hasMedia(inputs: RunInputs): boolean {
  return Object.values(inputs).some(
    (value) => Array.isArray(value) && value.length > 0
  )
}

function amountsOfRun(
  own: readonly RateRow[],
  form: ModelForm,
  inputs: RunInputs
): Amounts | null {
  const run = factsOf(form, inputs)
  const scored = own.flatMap((row) => {
    const score = scoreOf(row.conditions, run)
    return score === null ? [] : [{ row, score }]
  })
  const settled = scored.filter((one) => one.score.open === 0)
  const best = Math.max(...settled.map((one) => one.score.holds))
  const top = scored.filter(
    (one) =>
      one.score.holds === best ||
      (one.score.open > 0 && one.score.holds >= best)
  )
  const count = roleNumber(form, inputs, "count") ?? 1
  const read = top.map((one) => amountsOf(one.row, run, count))
  if (read.length === 0 || read.some((one) => one === null)) {
    return null
  }
  const known = read.flatMap((one) => (one === null ? [] : [one]))
  return {
    credits: known.flatMap((one) => one.credits),
    exact: known.every((one) => one.exact),
  }
}

function usagePriceOf(
  rows: readonly RateRow[],
  model: string,
  values: Values
): number | null | undefined {
  const rates = new Set(
    rows
      .filter((row) => row.model === model && row.unit === usageCredit)
      .map((row) => row.credits)
  )
  if (rates.size === 0) {
    return undefined
  }
  const [rate] = [...rates]
  const table = usageTables.find((one) => one.models.includes(model))
  if (rates.size > 1 || rate === undefined || table === undefined) {
    return null
  }
  if (table.refuses.some((setting) => holds(setting, values))) {
    return null
  }
  const extra = table.surcharges
    .filter((surcharge) => surcharge.when.some((one) => holds(one, values)))
    .reduce((sum, surcharge) => sum + surcharge.credits, 0)
  return (table.credits + extra) * rate
}

function holds(setting: Setting, values: Values): boolean {
  const held = values.get(setting.key)
  return held !== undefined && setting.values.includes(held)
}
