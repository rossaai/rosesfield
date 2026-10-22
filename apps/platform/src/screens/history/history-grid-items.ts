import type { Run } from "@rosesfield/contract"
import { runAspect } from "@/pieces/run/run-facts"
import type { GridItem } from "@/screens/library/result-grid"

export function historyGridItems(runs: readonly Run[]): GridItem[] {
  return runs.flatMap((run) =>
    run.outputs.map((assetId) => ({ assetId, run, aspect: runAspect(run) }))
  )
}

export type HistoryShown = "grid" | "rows" | "empty"

export function historyShownOf(
  runs: readonly Run[],
  layout: "grid" | "list"
): HistoryShown {
  if (runs.length === 0) {
    return "empty"
  }
  return layout === "grid" && runs.some((run) => run.outputs.length > 0)
    ? "grid"
    : "rows"
}
