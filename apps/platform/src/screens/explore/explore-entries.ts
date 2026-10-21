import type { Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useQueries, useQuery } from "@tanstack/react-query"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { runAspect } from "@/pieces/run/run-facts"
import {
  admissionsByRun,
  type ExploreAdmission,
  exploreListQuery,
  isAdmitted,
} from "@/screens/explore/explore-list"
import type { ExploreEntry } from "@/screens/explore/explore-tile"
import { type SharedOutput, shareQuery } from "@/screens/explore/share-api"

export type ExploreEntries =
  | { state: "loading" }
  | { state: "failed"; retry: () => void }
  | { state: "ready"; entries: ExploreEntry[] }

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

export function exploreShares(list: readonly ExploreAdmission[]): string[] {
  return [
    ...new Set(
      list.flatMap((admission) =>
        admission.shareId === undefined ? [] : [admission.shareId]
      )
    ),
  ]
}

function isUnreachable(error: Error | null): boolean {
  return error instanceof GatewayUnreachableError
}

export function useExploreEntries(): ExploreEntries {
  const list = useQuery(exploreListQuery)
  const shares = useQueries({
    queries: exploreShares(list.data).map((shareId) => shareQuery(shareId)),
  })
  if (shares.length > 0 && shares.every((read) => isUnreachable(read.error))) {
    return {
      state: "failed",
      retry: () => {
        for (const read of shares) {
          void read.refetch()
        }
      },
    }
  }
  if (shares.some((read) => read.isPending)) {
    return { state: "loading" }
  }
  return {
    state: "ready",
    entries: admittedEntries(
      sharedEntries(shares.flatMap((read) => read.data ?? [])),
      list.data
    ),
  }
}
