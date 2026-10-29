import type { EndKeySteps } from "@rosesfield/catalog/motion"
import type { Run } from "@rosesfield/contract"
import { t, tCatalog } from "@/copy/t"

export type OutputId = Parameters<EndKeySteps["restore"]>[0]

export type ChainStage =
  | { stage: "idle" }
  | { stage: "drafting" }
  | { stage: "makeFinal"; draft: Run; frame: OutputId }
  | { stage: "restoring"; draft: Run }
  | { stage: "renderFinal"; draft: Run; endKey: OutputId }
  | { stage: "finishing" }

export const busyStages: readonly ChainStage["stage"][] = [
  "drafting",
  "restoring",
  "finishing",
]

const labelKeys = {
  idle: "run.generate",
  makeFinal: "motion.chain.makeFinal",
  renderFinal: "motion.chain.renderFinal",
} as const

export function labelOf(chain: ChainStage, resolution: string): string {
  switch (chain.stage) {
    case "makeFinal":
    case "restoring":
      return tCatalog(labelKeys.makeFinal)
    case "renderFinal":
    case "finishing":
      return tCatalog(labelKeys.renderFinal, { resolution })
    default:
      return t(labelKeys.idle)
  }
}
