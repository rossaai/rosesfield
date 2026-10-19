import type { Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { runsOf, runsQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { runAspect } from "@/pieces/run/run-facts"
import type { ExploreEntry, ExploreKind } from "@/screens/explore/explore-tile"
import { publishedQuery, type ShareView } from "@/screens/explore/share-api"

export type ExploreFilter = "all" | ExploreKind

export type ExploreEntries =
  | { state: "loading" }
  | { state: "failed"; retry: () => void }
  | { state: "ready"; entries: ExploreEntry[] }

const kinds: readonly string[] = ["image", "video", "audio"]

function isExploreKind(kind: string | undefined): kind is ExploreKind {
  return kind !== undefined && kinds.includes(kind)
}

function aspectOf(
  width: number | null,
  height: number | null,
  run: Run
): MediaAspect | undefined {
  return width !== null && height !== null ? { width, height } : runAspect(run)
}

export function sharedEntries(shares: readonly ShareView[]): ExploreEntry[] {
  return shares.flatMap((share) => {
    const first = share.media[0]
    if (first === undefined) {
      return []
    }
    return [
      {
        key: `share-${share.id}`,
        run: share.run,
        kind: first.kind,
        aspect: aspectOf(first.width, first.height, share.run),
        source: {
          kind: "share",
          shareId: share.id,
          src: first.kind === "image" ? (share.poster ?? first.src) : first.src,
          poster: share.poster,
        },
      },
    ]
  })
}

export function ownEntries(runs: readonly Run[]): ExploreEntry[] {
  return runs.flatMap((run) => {
    const kind = findCatalogApp(run.appId)?.output.kind
    const [assetId] = run.outputs
    if (
      run.status !== "done" ||
      run.origin !== "live" ||
      assetId === undefined ||
      !isExploreKind(kind)
    ) {
      return []
    }
    return [
      {
        key: `run-${run.id}`,
        run,
        kind,
        aspect: kind === "audio" ? undefined : runAspect(run),
        source: { kind: "own", assetId },
      },
    ]
  })
}

export function filterEntries(
  entries: readonly ExploreEntry[],
  filter: ExploreFilter
): ExploreEntry[] {
  return filter === "all"
    ? [...entries]
    : entries.filter((entry) => entry.kind === filter)
}

export function useExploreEntries(): ExploreEntries {
  const published = useQuery(publishedQuery)
  const runs = useInfiniteQuery(runsQuery(null))
  if (published.isError && runs.isError) {
    return {
      state: "failed",
      retry: () => {
        void published.refetch()
        void runs.refetch()
      },
    }
  }
  if (published.isPending || runs.isPending) {
    return { state: "loading" }
  }
  return {
    state: "ready",
    entries: [
      ...sharedEntries(published.data ?? []),
      ...ownEntries(runsOf(runs.data)),
    ],
  }
}
