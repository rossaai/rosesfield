import { catalogRoutes } from "@rosesfield/catalog/comfy"
import { queryOptions } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"

export function modelCatalogQuery(appId: string, keyState: string) {
  return queryOptions({
    queryKey: ["models", appId, keyState],
    queryFn: ({ signal }) =>
      callRoute(catalogRoutes.listModels, { params: { appId }, signal }),
    staleTime: 60_000,
    retry: false,
  })
}

export type PriceAsk = {
  inputs: Readonly<Record<string, string | number | string[]>>
  count?: number | undefined
  aspectRatio?: string | null | undefined
}

export function priceQuery(appId: string, ask: PriceAsk, keyState: string) {
  const body = {
    inputs: ask.inputs,
    ...(ask.count === undefined ? {} : { count: ask.count }),
    ...(ask.aspectRatio === undefined ? {} : { aspectRatio: ask.aspectRatio }),
  }
  return queryOptions({
    queryKey: ["price", appId, keyState, body],
    queryFn: ({ signal }) =>
      callRoute(catalogRoutes.priceRun, { params: { appId }, body, signal }),
    staleTime: 60_000,
    retry: false,
  })
}
