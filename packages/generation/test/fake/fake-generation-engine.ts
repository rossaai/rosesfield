import type { EngineBinding, KeyCheck, RunOrigin } from "@rosesfield/contract"
import {
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type Idempotency,
  type OutputsPerJob,
} from "#domain/generation-engine.port"

type Step = EngineStatus | Error

type FakeGenerationEngineOptions = {
  key?: string
  origin?: RunOrigin
  idempotency?: Idempotency
  outputsPerJob?: OutputsPerJob
  keyCheck?: KeyCheck
  steps?: Step[]
  stepsByRef?: Record<string, Step[]>
  outputs?: EngineOutput[]
  submitErrors?: Error[]
  onRead?: () => Promise<void>
}

export class FakeGenerationEngine extends GenerationEngine {
  override readonly key: string
  override readonly origin: RunOrigin
  override readonly idempotency: Idempotency

  readonly submitted: EngineRequest[] = []
  readonly cancelled: string[] = []
  readonly reads: string[] = []
  private readonly perJob: OutputsPerJob
  private readonly keyCheck: KeyCheck
  private readonly steps: Step[]
  private readonly stepsByRef: Record<string, Step[]>
  private readonly outputs: EngineOutput[]
  private readonly submitErrors: Error[]
  private readonly onRead: () => Promise<void>

  constructor(options: FakeGenerationEngineOptions = {}) {
    super()
    this.key = options.key ?? "fake-engine"
    this.origin = options.origin ?? "live"
    this.idempotency = options.idempotency ?? "keyed"
    this.perJob = options.outputsPerJob ?? "all"
    this.keyCheck = options.keyCheck ?? "valid"
    this.steps = options.steps ?? [{ state: "succeeded" }]
    this.stepsByRef = options.stepsByRef ?? {}
    this.outputs = options.outputs ?? []
    this.submitErrors = options.submitErrors ?? []
    this.onRead = options.onRead ?? (async () => undefined)
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === this.key
  }

  override outputsPerJob(_binding: EngineBinding): OutputsPerJob {
    return this.perJob
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const error = this.submitErrors.shift()
    if (error !== undefined) {
      throw error
    }
    this.submitted.push(request)
    return {
      ref: `fake-${this.submitted.length}`,
      models: ["fake-model"],
      workflowHash: null,
    }
  }

  override async read(ref: string): Promise<EngineStatus> {
    this.reads.push(ref)
    await this.onRead()
    const steps = this.stepsByRef[ref] ?? this.steps
    const step = steps.length > 1 ? steps.shift() : steps[0]
    if (step === undefined) {
      return { state: "succeeded" }
    }
    if (step instanceof Error) {
      throw step
    }
    return step
  }

  override async listOutputs(_ref: string): Promise<EngineOutput[]> {
    return this.outputs.map((output) => ({
      ...output,
      bytes: new Uint8Array(output.bytes),
    }))
  }

  override async cancel(ref: string): Promise<void> {
    this.cancelled.push(ref)
  }

  override async checkKey(): Promise<KeyCheck> {
    return this.keyCheck
  }
}
