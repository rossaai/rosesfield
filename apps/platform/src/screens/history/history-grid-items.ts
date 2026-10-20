import type { Run } from "@rosesfield/contract"
import { runAspect } from "@/pieces/run/run-facts"
import type { GridItem } from "@/screens/library/result-grid"

export function historyGridItems(runs: readonly Run[]): GridItem[] {
  return runs.flatMap((run) =>
    run.outputs.map((assetId) => ({ assetId, run, aspect: runAspect(run) }))
  )
}
