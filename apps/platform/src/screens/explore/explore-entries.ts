import type { Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useQueries, useQuery } from "@tanstack/react-query"
import { runQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { runAspect } from "@/pieces/run/run-facts"
import {
  admissionsByRun,
  type ExploreAdmission,
  exploreListQuery,
  isAdmitted,
} from "@/screens/explore/explore-list"
import type { ExploreEntry, ExploreKind } from "@/screens/explore/explore-tile"
import { type SharedOutput, shareQuery } from "@/screens/explore/share-api"

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

export function sharedEntries(shares: readonly SharedOutput[]): ExploreEntry[] {
  return shares.flatMap((share) => {
    const first = share.media[0]
    const src = share.sources[0]
    if (first === undefined || src === undefined) {
      return []
    }
    return [
      {
        key: `share-${share.id}`,
        run: share.run,
        kind: first.kind,
        aspect: aspectOf(first.width, first.height, share.run),
        source: { kind: "share", shareId: share.id, src },
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

export function admittedEntries(
  entries: readonly ExploreEntry[],
  list: readonly ExploreAdmission[]
): ExploreEntry[] {
  const admissions = admissionsByRun(list)
  const shown = new Set<string>()
  return entries.filter((entry) => {
    if (
      shown.has(entry.run.id) ||
      !isAdmitted(admissions.get(entry.run.id), entry.run)
    ) {
      return false
    }
    shown.add(entry.run.id)
    return true
  })
}

export type ExploreReads = { runIds: string[]; shareIds: string[] }

export function exploreReads(list: readonly ExploreAdmission[]): ExploreReads {
  const runIds = [...new Set(list.map((admission) => admission.runId))]
  const shareIds = [
    ...new Set(
      list.flatMap((admission) =>
        admission.shareId === undefined ? [] : [admission.shareId]
      )
    ),
  ]
  return { runIds, shareIds }
}

export function useExploreEntries(): ExploreEntries {
  const list = useQuery(exploreListQuery)
  const reads = exploreReads(list.data)
  const shares = useQueries({
    queries: reads.shareIds.map((shareId) => shareQuery(shareId)),
  })
  const runs = useQueries({
    queries: reads.runIds.map((runId) => runQuery(runId)),
  })
  const all = [...shares, ...runs]
  if (all.length > 0 && all.every((read) => read.isError)) {
    return {
      state: "failed",
      retry: () => {
        for (const read of all) {
          void read.refetch()
        }
      },
    }
  }
  if (all.some((read) => read.isPending)) {
    return { state: "loading" }
  }
  return {
    state: "ready",
    entries: admittedEntries(
      [
        ...sharedEntries(shares.flatMap((read) => read.data ?? [])),
        ...ownEntries(runs.flatMap((read) => read.data?.run ?? [])),
      ],
      list.data
    ),
  }
}
