import type { Run } from "@rosesfield/contract"
import type { ChainRun } from "#domain/run-chain.port"

export type OutputId = Run["outputs"][number]

export type StepRun = {
  appId: string
  request: ChainRun
}

export type EndKeySteps = {
  draft: StepRun
  restore: (frame: OutputId) => StepRun
  final: (draft: Run, endKey: OutputId) => StepRun
}
