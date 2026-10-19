import type { Run } from "@rosesfield/contract"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { isWorking, runsOf, runsQuery } from "@/api/queries"

export function useRecentRuns(): Run[] {
  const runs = useInfiniteQuery(runsQuery(null))
  return useMemo(() => runsOf(runs.data), [runs.data])
}

export function useWorkingRuns(): Run[] {
  const runs = useRecentRuns()
  return useMemo(() => runs.filter(isWorking), [runs])
}
