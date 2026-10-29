import type { Cost, HeldOutput } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import type { EngineSteps } from "#domain/generation-engine.port"

export type RunJobStatus =
  | "pending"
  | "submitting"
  | "queued"
  | "running"
  | "collecting"
  | "done"

export type RunJob = {
  index: number
  seed: number | null
  ref: string | null
  status: RunJobStatus
  progress: number | null
  outputs: AssetId[]
  held?: HeldOutput[]
  dropped?: number
  cost?: Cost
  collectingSince?: string
  submittingSince?: string
  steps?: EngineSteps
}
