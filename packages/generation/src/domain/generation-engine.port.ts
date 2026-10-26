import type {
  AssetKind,
  Cost,
  EngineBinding,
  KeyCheck,
  Run,
  RunInputs,
  RunOrigin,
} from "@rosesfield/contract"
import type { AssetId, ProjectError } from "@rosesfield/kernel"
import type { ModelForm } from "#domain/model-form"

export type EngineFile = {
  assetId: AssetId
  kind: AssetKind
  mime: string
  bytes: Uint8Array
}

export type RunPlan = NonNullable<Run["plan"]>

export type EngineStepOutput = Omit<
  EngineOutput,
  "bytes" | "stills" | "preview"
> & {
  assetId: AssetId
}

export type EngineStepJob = {
  number: number
  engine: string
  ref: string
  cost?: Cost
  made?: EngineStepOutput
}

export type EngineSteps = {
  plan: RunPlan
  planCost?: Cost
  jobs: readonly EngineStepJob[]
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
  steps?: EngineSteps
}

export type EngineFinished = {
  outputs: readonly EngineOutput[]
  cost: Cost | null
}

export type EngineSubmission = {
  ref: string
  models: readonly string[]
  workflowHash: string | null
  finished?: EngineFinished
}

export type EngineStatus =
  | {
      state: "queued" | "running"
      progress: number | null
      retryAfterSeconds: number | null
      steps?: EngineSteps
    }
  | { state: "succeeded"; cost?: Cost | null; steps?: EngineSteps }
  | { state: "failed"; error: ProjectError }
  | { state: "cancelled" }

export type EngineOutput = {
  kind: AssetKind
  mime: string
  bytes: Uint8Array
  width: number | null
  height: number | null
  durationSeconds: number | null
  stills?: readonly Uint8Array[]
  preview?: EnginePreview
}

export type EnginePreview = {
  mime: string
  bytes: Uint8Array
}

export type OutputsPerJob = "all" | "one"

export type HostedModel = {
  id: string
  provider: string
  takes: readonly string[]
  makes: readonly string[]
  takesTools?: boolean
  form: ModelForm | null
}

export type PriceRequest = {
  inputs: RunInputs
  count: number
}

export type PricedSource = "measured" | "estimate" | "rates"

export type PriceFrom =
  | "measured"
  | "engine-estimate"
  | "rate-card"
  | "node-price"
  | "model-runs"
  | "task-runs"

export type KnownPrice = {
  source: PricedSource
  credits: number
  low?: number
  from?: PriceFrom
  perOutput?: true
}

export type RunPrice = KnownPrice | { source: "unknown"; credits: null }

export const unknownPrice: RunPrice = { source: "unknown", credits: null }

export type Idempotency = "keyed" | "none"

export type Pause = (ms: number, signal: AbortSignal) => Promise<void>

export type StatusReads = {
  everyMs: number
  pause: Pause
  signal: AbortSignal
}

export function isWorkingStatus(
  status: EngineStatus
): status is Extract<EngineStatus, { state: "queued" | "running" }> {
  return status.state === "queued" || status.state === "running"
}

export function pauseOn(
  after: (ms: number, callback: () => void) => () => void
): Pause {
  return (ms, signal) =>
    new Promise((resolve) => {
      if (signal.aborted) {
        resolve()
        return
      }
      let cancel: () => void = () => undefined
      const stop = (): void => {
        cancel()
        resolve()
      }
      signal.addEventListener("abort", stop, { once: true })
      cancel = after(ms, () => {
        signal.removeEventListener("abort", stop)
        resolve()
      })
    })
}

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

  /** Says the longest time one submit can take before the engine's own timeouts end it. */
  abstract submitLimitMs(): number

  /** Reads the status of a submitted run once. */
  abstract read(ref: string): Promise<EngineStatus>

  /** Yields the statuses of a submitted run as the engine reports them, and ends when the run ends, the engine stops reporting, or the signal aborts. */
  async *watch(
    ref: string,
    _signal: AbortSignal
  ): AsyncGenerator<EngineStatus, void, void> {
    yield await this.read(ref)
  }

  /** Lists the outputs of a run that succeeded, with their bytes, and never fetches an address the run's inputs name. */
  abstract listOutputs(ref: string, inputs: RunInputs): Promise<EngineOutput[]>

  /** Asks the engine to stop a submitted run. */
  abstract cancel(ref: string): Promise<void>

  /** Says whether this engine still holds the run of this ref. An engine that keeps its runs in memory loses them when the server restarts. */
  holds(_ref: string): boolean {
    return true
  }

  /** Says whether a run's jobs go to this engine one after another, so each job's cost is read on its own. */
  submitsAlone(): boolean {
    return false
  }

  /** Checks the engine's key with a call that starts no paid run. */
  abstract checkKey(): Promise<KeyCheck>

  /** Says whether a key check asks this engine, or another engine checks the same key. */
  checksKey(): boolean {
    return true
  }

  /** Describes the inputs a hosted model takes, or null when the app's own inputs apply. */
  formOf(_binding: EngineBinding): Promise<ModelForm | null> {
    return Promise.resolve(null)
  }

  /** Lists the hosted models this engine runs, with the media each takes and makes. */
  listModels(): Promise<readonly HostedModel[]> {
    return Promise.resolve([])
  }

  /** Prices one run before it starts, in the engine's credits. */
  priceOf(_binding: EngineBinding, _request: PriceRequest): Promise<RunPrice> {
    return Promise.resolve(unknownPrice)
  }

  /** Reads the status every `everyMs` and yields each one, until the run ends or the signal aborts. */
  protected async *readEvery(
    ref: string,
    reads: StatusReads
  ): AsyncGenerator<EngineStatus, void, void> {
    while (!reads.signal.aborted) {
      const status = await this.read(ref)
      yield status
      if (!isWorkingStatus(status)) {
        return
      }
      await reads.pause(reads.everyMs, reads.signal)
    }
  }

  /** Says what a cost this engine measured comes to in its credits, or null when it has no credits. */
  creditsOf(_cost: Cost): number | null {
    return null
  }
}
