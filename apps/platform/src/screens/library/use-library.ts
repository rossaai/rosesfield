import type { Asset, Run } from "@rosesfield/contract"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { assetsQuery } from "@/api/queries"
import { runAppName, runHeadline } from "@/pieces/run/run-facts"
import { useNextPage } from "@/pieces/use-next-page"
import type { LibraryKind } from "@/screens/library/library-bars"
import { type GridItem, gridItemOf } from "@/screens/library/result-grid"
import { useRecentRuns } from "@/shell/use-working-runs"

export type LibraryData = {
  assets: Asset[]
  shown: Asset[]
  runsById: ReadonlyMap<string, Run>
  isPending: boolean
  isError: boolean
  refetch: () => void
  sentinel: (node: HTMLElement | null) => void
}

function matches(run: Run | undefined, query: string): boolean {
  if (query === "") {
    return true
  }
  if (run === undefined) {
    return false
  }
  return `${runHeadline(run)} ${runAppName(run)}`
    .toLowerCase()
    .includes(query.toLowerCase())
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

export function useLibrary(kind: LibraryKind, query: string): LibraryData {
  const assets = useInfiniteQuery(assetsQuery(kind === "all" ? null : kind))
  const runs = useRecentRuns()
  const runsById = useMemo(
    () => new Map(runs.map((run) => [run.id, run])),
    [runs]
  )
  const list = useMemo(
    () => assets.data?.pages.flatMap((page) => page.assets) ?? [],
    [assets.data]
  )
  const sentinel = useNextPage(
    assets.hasNextPage && !assets.isFetchingNextPage,
    () => void assets.fetchNextPage()
  )
  return {
    assets: list,
    shown: list.filter((asset) =>
      matches(
        asset.sourceRunId === null
          ? undefined
          : runsById.get(asset.sourceRunId),
        query.trim()
      )
    ),
    runsById,
    isPending: assets.isPending,
    isError: assets.isError,
    refetch: () => void assets.refetch(),
    sentinel,
  }
}
