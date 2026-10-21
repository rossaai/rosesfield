import type { Cost, EngineBinding, KeyCheck } from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type OutputsPerJob,
  RunFailedError,
  type RunPrice,
  unknownPrice,
} from "@rosesfield/generation"

const madeBytes = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70)

const made: EngineOutput = {
  kind: "video",
  mime: "video/mp4",
  bytes: madeBytes,
  width: 848,
  height: 480,
  durationSeconds: 5,
}

const eachCost: Cost = { amount: 0.01, currency: "USD" }

type FakeShotEngineOptions = {
  isAlone?: boolean
  isNow?: boolean
  credits?: number | null
  cost?: Cost | null
}

export class FakeShotEngine extends GenerationEngine {
  override readonly key = comfyWorkflowAdapter
  override readonly origin = "live"
  override readonly idempotency = "keyed"
  readonly sent: EngineRequest[] = []
  readonly cancelled: string[] = []
  private readonly isAlone: boolean
  private readonly isNow: boolean
  private readonly credits: number | null
  private readonly cost: Cost | null

  constructor(options: FakeShotEngineOptions = {}) {
    super()
    this.isAlone = options.isAlone ?? false
    this.isNow = options.isNow ?? false
    this.credits = options.credits ?? null
    this.cost = options.cost === undefined ? eachCost : options.cost
  }

  override async priceOf(): Promise<RunPrice> {
    return this.credits === null
      ? unknownPrice
      : { source: "rates", credits: this.credits }
  }

  override creditsOf(cost: Cost): number | null {
    return this.credits === null ? null : cost.amount * 100
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === comfyWorkflowAdapter
  }

  override outputsPerJob(): OutputsPerJob {
    return "one"
  }

  override submitsAlone(): boolean {
    return this.isAlone
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    this.sent.push(request)
    return this.isNow
      ? {
          ref: `now-${this.sent.length}`,
          models: [],
          workflowHash: null,
          finished: { outputs: [made], cost: this.cost },
        }
      : { ref: `job-${this.sent.length}`, models: [], workflowHash: null }
  }

  override submitLimitMs(): number {
    return 1000
  }

  override async read(ref: string): Promise<EngineStatus> {
    return ref.startsWith("now-")
      ? { state: "succeeded" }
      : { state: "succeeded", cost: this.cost }
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    if (ref.startsWith("now-")) {
      throw new RunFailedError({
        cause: "a synchronous run keeps its outputs at submit",
      })
    }
    return [made]
  }

  override async cancel(ref: string): Promise<void> {
    this.cancelled.push(ref)
  }

  override async checkKey(): Promise<KeyCheck> {
    return "valid"
  }
}
