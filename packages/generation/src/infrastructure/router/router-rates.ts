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
  highestInputsOf,
  namedKeysOf,
  type RateRow,
  type RunFacts,
  roleNumber,
  type Score,
  scoreOf,
  type Values,
  valuesOf,
} from "#infrastructure/router/router-rate-match"
import {
  type Amounts,
  amountsOf,
  billedInputsOf,
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
 * to the highest when they disagree. A row billed per input image adds its
 * credits once per image the run carries that it bills. A range, a converted
 * token count or a filled setting whose rows disagree is not exact. When the
 * filled runs are cut, the highest any fitting row can bill is added as the
 * upper end, and the price is not exact.
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
  const card: Card = {
    own: rows.filter((row) => row.model === form.model && isPriced(row)),
    perInput: rows.filter(
      (row) => row.model === form.model && isPerInput(row.unit)
    ),
    images: imagesOf(form, inputs),
  }
  const keys = namedKeysOf(
    form.model,
    [...card.own, ...card.perInput].map((row) => row.conditions)
  )
  const needsSeconds = card.own.some((row) => isPerTime(row.unit))
  const filled = filledRunsOf(form, inputs, keys, needsSeconds)
  const read = filled.runs.flatMap((run) => {
    const one = amountsOfRun(card, form, run)
    return one === null ? [] : [one]
  })
  if (read.length === 0) {
    return null
  }
  const credits = read.flatMap((one) => one.credits)
  if (filled.cut) {
    const highest = highestOf(
      card,
      form,
      inputs,
      highestInputsOf(form, inputs, keys, needsSeconds)
    )
    if (highest === null) {
      return null
    }
    credits.push(highest)
  }
  return priceOf(
    credits.map((value) => value * each),
    !filled.cut && read.every((one) => one.exact),
    true
  )
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

type Card = {
  own: readonly RateRow[]
  perInput: readonly RateRow[]
  images: number
}

/** Counts the images the run carries in the form's image inputs. */
function imagesOf(form: ModelForm, inputs: RunInputs): number {
  return form.fields
    .filter((field) => field.kind === "media" && field.media === "image")
    .reduce((sum, field) => {
      const given = inputs[field.name]
      return sum + (Array.isArray(given) ? given.length : 0)
    }, 0)
}

type Scored = { row: RateRow; score: Score }

function scoredOf(rows: readonly RateRow[], run: RunFacts): Scored[] {
  return rows.flatMap((row) => {
    const score = scoreOf(row.conditions, run)
    return score === null ? [] : [{ row, score }]
  })
}

/** Keeps the rows that fit the run best: every settled row with the most conditions held, and every open row that holds as many. */
function bestOf(scored: readonly Scored[]): RateRow[] {
  const settled = scored.filter((one) => one.score.open === 0)
  const best = Math.max(...settled.map((one) => one.score.holds))
  return scored
    .filter(
      (one) =>
        one.score.holds === best ||
        (one.score.open > 0 && one.score.holds >= best)
    )
    .map((one) => one.row)
}

function amountsOfRun(
  card: Card,
  form: ModelForm,
  inputs: RunInputs
): Amounts | null {
  const run = factsOf(form, inputs)
  const top = bestOf(scoredOf(card.own, run))
  const count = roleNumber(form, inputs, "count") ?? 1
  const read = top.map((row) => amountsOf(row, run, count))
  const charge = inputChargeOf(card, bestOf(scoredOf(card.perInput, run)))
  if (
    read.length === 0 ||
    read.some((one) => one === null) ||
    charge === null
  ) {
    return null
  }
  const known = read.flatMap((one) => (one === null ? [] : [one]))
  return {
    credits: known.flatMap((one) =>
      one.credits.flatMap((base) => charge.credits.map((added) => base + added))
    ),
    exact: charge.exact && known.every((one) => one.exact),
  }
}

/**
 * The credits the run's images add, once per value the fitting per-input
 * rows give. A run with no image adds nothing. A run with images whose
 * per-input rows all fail to fit has no known charge.
 */
function inputChargeOf(card: Card, rows: readonly RateRow[]): Amounts | null {
  if (card.images === 0 || card.perInput.length === 0) {
    return { credits: [0], exact: true }
  }
  if (rows.length === 0) {
    return null
  }
  const billed = rows.map((row) => ({
    row,
    ...billedInputsOf(row, card.images),
  }))
  return {
    credits: billed.map((one) => one.row.credits * one.count),
    exact: billed.every((one) => one.exact),
  }
}

/**
 * The most any row that fits the run could bill, read with every setting
 * the filled runs vary left open, and with its numbers at their highest, so
 * no combination the cut runs left out bills more. Null when a fitting row
 * has no amount at those settings.
 */
function highestOf(
  card: Card,
  form: ModelForm,
  inputs: RunInputs,
  highest: RunInputs
): number | null {
  const open = factsOf(form, inputs)
  const top = factsOf(form, highest)
  const count = roleNumber(form, highest, "count") ?? 1
  const read = scoredOf(card.own, open).map((one) =>
    amountsOf(one.row, top, count)
  )
  const charge = inputChargeOf(
    card,
    scoredOf(card.perInput, open).map((one) => one.row)
  )
  if (
    read.length === 0 ||
    read.some((one) => one === null) ||
    charge === null
  ) {
    return null
  }
  const known = read.flatMap((one) => (one === null ? [] : one.credits))
  return Math.max(...known) + Math.max(...charge.credits)
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
