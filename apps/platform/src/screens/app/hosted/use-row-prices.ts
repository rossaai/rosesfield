import { type PricesResponse, priceAsksMax } from "@rosesfield/catalog/comfy"
import type { ModelPrice } from "@rosesfield/ui/components/model-row"
import { useQuery } from "@tanstack/react-query"
import { t } from "@/copy/t"
import {
  type PriceAsk,
  pricesQuery,
} from "@/screens/app/hosted/model-catalog-query"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { amountOf, type QuoteSource } from "@/screens/app/use-start-run"

export type RowPrices = {
  prices: ReadonlyMap<string, ModelPrice>
  isPricing: boolean
}

const askDelayMs = 300

const rowNames = {
  measured: "run.price.measured",
  estimate: "run.price.estimated",
  rates: "run.price.credits",
} as const satisfies Record<QuoteSource, string>

export function rowPriceOf(
  credits: number | null,
  source: QuoteSource = "rates",
  low?: number
): ModelPrice | null {
  const amount = amountOf(credits, low)
  return amount === null
    ? null
    : { amount, name: t(rowNames[source], { amount }) }
}

export function rowPricesOf(
  ids: readonly string[],
  answer: PricesResponse | undefined
): Map<string, ModelPrice> {
  const prices = new Map<string, ModelPrice>()
  ids.forEach((id, at) => {
    const answered = answer?.prices[at]
    const price =
      answered === undefined || answered.source === "unknown"
        ? null
        : rowPriceOf(answered.credits, answered.source, answered.low)
    if (price !== null) {
      prices.set(id, price)
    }
  })
  return prices
}

type AskPrices = {
  appId: string
  keyState: string
  ids: readonly string[]
  askOf: (id: string) => PriceAsk
  isOpen: boolean
}

export function useAskPrices(options: AskPrices): RowPrices {
  const ids = options.ids.slice(0, priceAsksMax)
  const ask =
    !options.isOpen || options.appId === "" || ids.length === 0
      ? null
      : { ids, asks: ids.map(options.askOf) }
  const held = useDebounced(ask, askDelayMs)
  const query = useQuery({
    ...pricesQuery(options.appId, held?.asks ?? [], options.keyState),
    enabled: held !== null,
  })
  return {
    prices: rowPricesOf(held?.ids ?? [], query.data),
    isPricing: ask !== null && (held === null || query.isPending),
  }
}

export function useRowPrices(hosted: HostedState, isOpen: boolean): RowPrices {
  const pricing = hosted.pricing
  const byId = new Map(hosted.models.map((model) => [model.id, model]))
  return useAskPrices({
    appId: pricing?.appId ?? "",
    keyState: hosted.keyState,
    ids: pricing === undefined ? [] : hosted.models.map((model) => model.id),
    askOf: (id) => {
      const model = byId.get(id)
      return model === undefined || pricing === undefined
        ? { inputs: {} }
        : pricing.askOf(model)
    },
    isOpen,
  })
}
