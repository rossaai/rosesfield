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

/** One held step a chain runs before its draft, made from the runs of the steps before it. */
export type LeadStep = {
  stage: string
  stepOf: (made: readonly Run[]) => Promise<StepRun>
}

/** The held steps a chain runs before its draft, such as a plan and a read of what the draft follows, and the end-key steps their runs make. */
export type ChainLead = {
  steps: readonly LeadStep[]
  /** Every step of the lead and the draft as they are priced before the first one runs. */
  priced: readonly StepRun[]
  endKeyStepsOf: (made: readonly Run[]) => Promise<EndKeySteps>
}
