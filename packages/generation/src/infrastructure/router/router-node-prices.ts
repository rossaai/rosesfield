import type { RunInputs } from "@rosesfield/contract"
import { fieldOfRole, isOneAtATime } from "#domain/field-role"
import type { ModelForm } from "#domain/model-form"
import { CreditMeter } from "#infrastructure/credit-meter"
import { nodePrices } from "#infrastructure/router/router-node-prices.gen"
import {
  factsOf,
  keyOf,
  roleNumber,
} from "#infrastructure/router/router-rate-match"
import { priceOf, type RatePrice } from "#infrastructure/router/router-rates"

type Setting = string | number | boolean

type NodeEntry = {
  readonly when: Readonly<Record<string, Setting>>
  readonly low: number
  readonly high: number
  readonly approximate: boolean
}

type NodePrice = {
  readonly per: string
  readonly entries: readonly NodeEntry[]
}

const models: Readonly<Record<string, NodePrice>> = nodePrices.models

/**
 * Prices a run from the price the Comfy partner node that runs the same
 * model publishes, read into `router-node-prices.gen.ts` at a pinned commit.
 * Every entry whose settings the run leaves unset stays in play, and their
 * prices give the range. A range, an approximate badge or an open setting is
 * not exact.
 */
export function nodePriceOf(
  form: ModelForm,
  inputs: RunInputs,
  output: string,
  count = 1
): RatePrice | null {
  if (!Object.hasOwn(models, form.model)) {
    return null
  }
  const priced = models[form.model]
  const { values } = factsOf(form, inputs)
  const isKnown = (key: string): boolean => values.has(key)
  const fitting = (priced?.entries ?? []).filter((entry) =>
    Object.entries(entry.when).every(
      ([key, value]) =>
        !isKnown(key) || values.get(key) === keyOf(String(value))
    )
  )
  const units = priced === undefined ? null : unitsOf(priced.per, form, inputs)
  if (fitting.length === 0 || units === null) {
    return null
  }
  const outputs =
    (roleNumber(form, inputs, "count") ?? 1) *
    (isOneAtATime(form.fields, output) ? count : 1)
  const credits = fitting.flatMap((entry) =>
    [entry.low, entry.high].map(
      (usd) => usd * CreditMeter.creditsPerUsd * units * outputs
    )
  )
  const isOpen = fitting.some((entry) =>
    Object.keys(entry.when).some((key) => !isKnown(key))
  )
  const isApproximate = fitting.some(
    (entry) => entry.approximate || entry.low !== entry.high
  )
  return priceOf(credits, !isOpen && !isApproximate, true)
}

function unitsOf(
  per: string,
  form: ModelForm,
  inputs: RunInputs
): number | null {
  switch (per) {
    case "run":
      return 1
    case "thousand-characters": {
      const prompt = fieldOfRole(form.fields, "prompt", "")
      const text = prompt === null ? undefined : inputs[prompt.name]
      return typeof text === "string" && text.length > 0
        ? text.length / 1000
        : null
    }
    default: {
      const seconds = factsOf(form, inputs).seconds
      if (seconds === null) {
        return null
      }
      return per === "minute" ? seconds / 60 : seconds
    }
  }
}
