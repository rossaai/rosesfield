import { type PricesResponse, priceAsksMax } from "@rosesfield/catalog/comfy"
import type { ModelPrice } from "@rosesfield/ui/components/model-row"
import { useQuery } from "@tanstack/react-query"
import { t } from "@/copy/t"
import { pricesQuery } from "@/screens/app/hosted/model-catalog-query"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { priceLabelsOf } from "@/screens/app/use-start-run"

export type RowPrices = {
  prices: ReadonlyMap<string, ModelPrice>
  isPricing: boolean
}

const askDelayMs = 300

export function rowPriceOf(credits: number | null): ModelPrice | null {
  const amount = priceLabelsOf(credits, false).priceValue ?? null
  return amount === null
    ? null
    : { amount, name: t("run.price.credits", { amount }) }
}

export function rowPricesOf(
  ids: readonly string[],
  answer: PricesResponse | undefined
): Map<string, ModelPrice> {
  const prices = new Map<string, ModelPrice>()
  ids.forEach((id, at) => {
    const price = rowPriceOf(answer?.prices[at]?.credits ?? null)
    if (price !== null) {
      prices.set(id, price)
    }
  })
  return prices
}

export function useRowPrices(hosted: HostedState, isOpen: boolean): RowPrices {
  const pricing = hosted.pricing
  const models = hosted.models.slice(0, priceAsksMax)
  const ask =
    !isOpen || pricing === undefined || models.length === 0
      ? null
      : {
          ids: models.map((model) => model.id),
          asks: models.map(pricing.askOf),
        }
  const held = useDebounced(ask, askDelayMs)
  const query = useQuery({
    ...pricesQuery(pricing?.appId ?? "", held?.asks ?? [], hosted.keyState),
    enabled: held !== null && pricing !== undefined,
  })
  return {
    prices: rowPricesOf(held?.ids ?? [], query.data),
    isPricing: ask !== null && (held === null || query.isPending),
  }
}
