import { type AppListing, routes } from "@rosesfield/contract"
import { queryOptions, useQuery } from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"

export const servedAppsQuery = queryOptions({
  queryKey: ["served-apps"],
  queryFn: ({ signal }) => callRoute(routes.listApps, { signal }),
  staleTime: Number.POSITIVE_INFINITY,
})

export function useClosedKey(app: AppListing): string | null {
  const served = useQuery(servedAppsQuery)
  const listed = served.data?.apps.find((one) => one.id === app.id)
  return listed?.closedKey ?? null
}
