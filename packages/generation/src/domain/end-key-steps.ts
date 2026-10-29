import type { Run } from "@rosesfield/contract"
import type { ChainRun } from "#domain/run-chain.port"

export type OutputId = Run["outputs"][number]

export type StepRun = {
  appId: string
  request: ChainRun
}

export type EndKeySteps = {
  draft: StepRun
  /** Finds the draft's last frame among the outputs it holds, or null when it holds none. */
  frameOf: (draft: Run) => OutputId | null
  restore: (frame: OutputId) => StepRun
  final: (draft: Run, endKey: OutputId) => StepRun
}
