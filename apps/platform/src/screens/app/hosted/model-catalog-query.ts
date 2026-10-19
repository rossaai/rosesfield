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

export function priceQuery(
  appId: string,
  inputs: Readonly<Record<string, string | number | string[]>>,
  keyState: string
) {
  return queryOptions({
    queryKey: ["price", appId, keyState, inputs],
    queryFn: ({ signal }) =>
      callRoute(catalogRoutes.priceRun, {
        params: { appId },
        body: { inputs },
        signal,
      }),
    staleTime: 60_000,
    retry: false,
  })
}
