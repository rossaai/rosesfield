import { catalogRoutes } from "@rosesfield/catalog/comfy"
import { queryOptions } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"
import { shownFormOf } from "@/screens/app/hosted/series-count"

export function modelCatalogQuery(appId: string, keyState: string) {
  return queryOptions({
    queryKey: ["models", appId, keyState],
    queryFn: async ({ signal }) => {
      const catalog = await callRoute(catalogRoutes.listModels, {
        params: { appId },
        signal,
      })
      return {
        ...catalog,
        models: catalog.models.map((model) =>
          model.form === null
            ? model
            : { ...model, form: shownFormOf(model.form) }
        ),
      }
    },
    staleTime: 60_000,
    retry: false,
  })
}

export type PriceAsk = {
  inputs: Readonly<Record<string, string | number | string[]>>
  count?: number | undefined
  aspectRatio?: string | null | undefined
}

function bodyOfAsk(ask: PriceAsk) {
  return {
    inputs: ask.inputs,
    ...(ask.count === undefined ? {} : { count: ask.count }),
    ...(ask.aspectRatio === undefined ? {} : { aspectRatio: ask.aspectRatio }),
  }
}

export function pricesQuery(
  appId: string,
  asks: readonly PriceAsk[],
  keyState: string
) {
  const body = { asks: asks.map(bodyOfAsk) }
  return queryOptions({
    queryKey: ["price", appId, keyState, body],
    queryFn: ({ signal }) =>
      callRoute(catalogRoutes.priceRuns, { params: { appId }, body, signal }),
    staleTime: 60_000,
    retry: false,
  })
}

export function priceQuery(appId: string, ask: PriceAsk, keyState: string) {
  const body = bodyOfAsk(ask)
  return queryOptions({
    queryKey: ["price", appId, keyState, body],
    queryFn: ({ signal }) =>
      callRoute(catalogRoutes.priceRun, { params: { appId }, body, signal }),
    staleTime: 60_000,
    retry: false,
  })
}
