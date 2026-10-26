import type { Asset, Run } from "@rosesfield/contract"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { assetsQuery, runsOf, runsQuery } from "@/api/queries"
import { useNextPage } from "@/pieces/use-next-page"
import { runHoldsWords } from "@/pieces/view/match-words"
import type { LibraryKind } from "@/screens/library/library-bars"
import { type GridItem, gridItemOf } from "@/screens/library/result-grid"

export type LibraryData = {
  assets: Asset[]
  shown: Asset[]
  runsById: ReadonlyMap<string, Run>
  isPending: boolean
  hasMore: boolean
  isFetchingMore: boolean
  fetchMore: () => void
  isError: boolean
  refetch: () => void
  sentinel: (node: HTMLElement | null) => void
}

function matches(
  run: Run | undefined,
  query: string,
  appId: string | null
): boolean {
  if (query === "" && appId === null) {
    return true
  }
  if (run === undefined || (appId !== null && run.appId !== appId)) {
    return false
  }
  return runHoldsWords(run, query)
}

function sourceRun(
  asset: Asset,
  runsById: ReadonlyMap<string, Run>
): Run | null {
  return asset.sourceRunId === null
    ? null
    : (runsById.get(asset.sourceRunId) ?? null)
}

export function libraryGridItems(
  data: Pick<LibraryData, "shown" | "runsById">
): GridItem[] {
  return data.shown.map((asset) =>
    gridItemOf(asset, sourceRun(asset, data.runsById))
  )
}

export function useLibrary(
  kind: LibraryKind,
  query: string,
  appId: string | null = null
): LibraryData {
  const assets = useInfiniteQuery(assetsQuery(kind === "all" ? null : kind))
  const runPages = useInfiniteQuery(runsQuery(appId))
  const runs = useMemo(() => runsOf(runPages.data), [runPages.data])
  const runsById = useMemo(
    () => new Map(runs.map((run) => [run.id, run])),
    [runs]
  )
  const list = useMemo(
    () => assets.data?.pages.flatMap((page) => page.assets) ?? [],
    [assets.data]
  )
  const runsToRead = appId !== null && runPages.hasNextPage
  const isFetchingMore =
    assets.isFetchingNextPage || runPages.isFetchingNextPage
  const fetchMore = (): void => {
    if (assets.hasNextPage) {
      void assets.fetchNextPage()
    }
    if (runsToRead) {
      void runPages.fetchNextPage()
    }
  }
  const sentinel = useNextPage(
    (assets.hasNextPage || runsToRead) && !isFetchingMore,
    fetchMore
  )
  return {
    assets: list,
    shown: list.filter((asset) =>
      matches(
        asset.sourceRunId === null
          ? undefined
          : runsById.get(asset.sourceRunId),
        query.trim(),
        appId
      )
    ),
    runsById,
    isPending: assets.isPending,
    hasMore: assets.hasNextPage || runsToRead,
    isFetchingMore,
    fetchMore,
    isError: assets.isError,
    refetch: () => void assets.refetch(),
    sentinel,
  }
}
