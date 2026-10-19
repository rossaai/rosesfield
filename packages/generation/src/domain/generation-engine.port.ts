import type {
  AssetKind,
  EngineBinding,
  KeyCheck,
  RunInputs,
  RunOrigin,
} from "@rosesfield/contract"
import type { AssetId, ProjectError } from "@rosesfield/kernel"

export type EngineFile = {
  assetId: AssetId
  kind: AssetKind
  mime: string
  bytes: Uint8Array
}

export type EngineRequest = {
  idempotencyKey: string
  binding: EngineBinding
  inputs: RunInputs
  files: readonly EngineFile[]
  count: number
  aspectRatio: string | null
  seed: number | null
  outputKind: AssetKind
  timeoutSeconds?: number
}

export type EngineSubmission = {
  ref: string
  models: readonly string[]
  workflowHash: string | null
}

export type EngineStatus =
  | {
      state: "queued" | "running"
      progress: number | null
      retryAfterSeconds: number | null
    }
  | { state: "succeeded" }
  | { state: "failed"; error: ProjectError }
  | { state: "cancelled" }

export type EngineOutput = {
  kind: AssetKind
  mime: string
  bytes: Uint8Array
  width: number | null
  height: number | null
  durationSeconds: number | null
}

export type OutputsPerJob = "all" | "one"

export type Idempotency = "keyed" | "none"

export abstract class GenerationEngine {
  abstract readonly key: string
  abstract readonly origin: RunOrigin

  /** Says whether a submit sent again with the same key starts no second run. */
  abstract readonly idempotency: Idempotency

  /** Says whether this engine runs the given binding. */
  abstract canRun(binding: EngineBinding): boolean

  /** Says whether one submit makes every output a run asks for, or one. */
  abstract outputsPerJob(binding: EngineBinding): OutputsPerJob

  /** Submits one run and returns the engine's own reference to it. */
  abstract submit(request: EngineRequest): Promise<EngineSubmission>

  /** Reads the status of a submitted run once. */
  abstract read(ref: string): Promise<EngineStatus>

  /** Lists the outputs of a run that succeeded, with their bytes. */
  abstract listOutputs(ref: string): Promise<EngineOutput[]>

  /** Asks the engine to stop a submitted run. */
  abstract cancel(ref: string): Promise<void>

  /** Checks the engine's key with a call that starts no paid run. */
  abstract checkKey(): Promise<KeyCheck>
}
