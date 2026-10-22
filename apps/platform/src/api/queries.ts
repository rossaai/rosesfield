import { type AssetKind, type Run, routes } from "@rosesfield/contract"
import {
  type InfiniteData,
  infiniteQueryOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query"
import { callRoute, type RouteOutput } from "@/api/call-route"
import { fetchSettings } from "@/api/gateway-settings"

type RunPage = RouteOutput<typeof routes.listRuns>

const firstCursor: string | null = null

export function isWorking(run: Run): boolean {
  return run.status === "queued" || run.status === "running"
}

export function runsOf(data: InfiniteData<RunPage> | undefined): Run[] {
  return data?.pages.flatMap((page) => page.runs) ?? []
}

export function keepRun(client: QueryClient, run: Run): void {
  client.setQueryData(["run", run.id], { run })
  client.setQueriesData<InfiniteData<RunPage>>(
    { queryKey: ["runs"] },
    (data) =>
      data === undefined
        ? data
        : {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              runs: page.runs.map((one) => (one.id === run.id ? run : one)),
            })),
          }
  )
}

function cursorPart(cursor: string | null): { cursor?: string } {
  return cursor === null ? {} : { cursor }
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: ({ signal }) => fetchSettings(signal),
  staleTime: 60_000,
})

export function runsQuery(appId: string | null) {
  return infiniteQueryOptions({
    queryKey: ["runs", { appId }],
    queryFn: ({ pageParam, signal }) =>
      callRoute(routes.listRuns, {
        query: {
          ...(appId === null ? {} : { appId }),
          ...cursorPart(pageParam),
        },
        signal,
      }),
    initialPageParam: firstCursor,
    getNextPageParam: (page) => page.next,
  })
}

export function runQuery(runId: string) {
  return queryOptions({
    queryKey: ["run", runId],
    queryFn: ({ signal }) =>
      callRoute(routes.getRun, { params: { runId }, signal }),
  })
}

export function assetsQuery(kind: AssetKind | null) {
  return infiniteQueryOptions({
    queryKey: ["assets", { kind }],
    queryFn: ({ pageParam, signal }) =>
      callRoute(routes.listAssets, {
        query: { ...(kind === null ? {} : { kind }), ...cursorPart(pageParam) },
        signal,
      }),
    initialPageParam: firstCursor,
    getNextPageParam: (page) => page.next,
  })
}

export function assetQuery(assetId: string) {
  return queryOptions({
    queryKey: ["asset", assetId],
    queryFn: ({ signal }) =>
      callRoute(routes.getAsset, { params: { assetId }, signal }),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export const charactersQuery = queryOptions({
  queryKey: ["characters"],
  queryFn: ({ signal }) => callRoute(routes.listCharacters, { signal }),
})

export function characterQuery(characterId: string) {
  return queryOptions({
    queryKey: ["character", characterId],
    queryFn: ({ signal }) =>
      callRoute(routes.getCharacter, { params: { characterId }, signal }),
  })
}
