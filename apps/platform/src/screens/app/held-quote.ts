import {
  fieldRoleOf,
  type ModelField,
  type PriceResponse,
} from "@rosesfield/catalog/comfy"
import type { StartRunBodyInput } from "@/screens/app/app-form"
import { countSwitchOf } from "@/screens/app/setting-table"

export type QuoteSource = "measured" | "estimate" | "rates"

export type QuoteFrom = NonNullable<
  Extract<PriceResponse["price"], { credits: number }>["from"]
>

export type Quote = {
  credits: number
  source: QuoteSource
  low?: number
  perOutput?: true
  from?: QuoteFrom
}

export type AnsweredQuote = {
  body: StartRunBodyInput
  quote: Quote | null
}

function countFieldOf(fields: readonly ModelField[]): ModelField | null {
  return fields.find((field) => fieldRoleOf(field, "") === "count") ?? null
}

/** Reads how many outputs a body asks for: its count, or the value of the model's own count setting. */
export function outputsOf(
  body: StartRunBodyInput,
  fields: readonly ModelField[]
): number {
  const field = countFieldOf(fields)
  const own = field === null ? undefined : body.inputs[field.name]
  const set = typeof own === "number" && own > 0 ? own : 1
  return (body.count ?? 1) * set
}

function withoutCount(
  body: StartRunBodyInput,
  fields: readonly ModelField[]
): string {
  const dropped = new Set(
    [countFieldOf(fields), countSwitchOf(fields)?.field ?? null].flatMap(
      (field) => (field === null ? [] : [field.name])
    )
  )
  const inputs = Object.fromEntries(
    Object.entries(body.inputs).filter(([name]) => !dropped.has(name))
  )
  return JSON.stringify({ ...body, inputs, count: undefined })
}

function scaled(quote: Quote, times: number): Quote {
  const cents = (credits: number): number => Math.round(credits * 100) / 100
  return {
    ...quote,
    credits: cents(quote.credits * times),
    ...(quote.low === undefined ? {} : { low: cents(quote.low * times) }),
  }
}

/**
 * Gives the price Generate shows for the body on screen from the last price
 * the server answered: the same price for the same body, the price scaled on
 * the client when only the count changed on a model priced per output, and
 * otherwise the last price while the new one loads, so the number never
 * blanks.
 */
export function heldQuoteOf(
  answered: AnsweredQuote | null,
  body: StartRunBodyInput | null,
  fields: readonly ModelField[]
): Quote | null {
  if (answered === null || body === null || answered.quote === null) {
    return null
  }
  const { quote } = answered
  const asked = outputsOf(answered.body, fields)
  const wanted = outputsOf(body, fields)
  const isCountOnly =
    asked !== wanted &&
    withoutCount(body, fields) === withoutCount(answered.body, fields)
  return isCountOnly && quote.perOutput === true
    ? scaled(quote, wanted / asked)
    : quote
}
