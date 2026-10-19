import type {
  Cost,
  EngineBinding,
  KeyCheck,
  RunOrigin,
} from "@rosesfield/contract"
import {
  type EngineFinished,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type HostedModel,
  type Idempotency,
  type OutputsPerJob,
  type PriceRequest,
  type RunPrice,
  unknownPrice,
} from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import { hostedModelAdapter, hostedModelOf } from "#domain/task-binding"

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
  forms?: readonly ModelForm[]
  price?: RunPrice
  refByKey?: boolean
  outputErrors?: Error[]
  finished?: EngineFinished
  creditsPerUsd?: number
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
  private readonly forms: readonly ModelForm[]
  private readonly price: RunPrice
  private readonly refByKey: boolean
  private readonly outputErrors: Error[]
  private readonly finished: EngineFinished | null
  private readonly creditsPerUsd: number | null
  readonly priced: PriceRequest[] = []

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
    this.forms = options.forms ?? []
    this.price = options.price ?? unknownPrice
    this.refByKey = options.refByKey ?? false
    this.outputErrors = options.outputErrors ?? []
    this.finished = options.finished ?? null
    this.creditsPerUsd = options.creditsPerUsd ?? null
  }

  override creditsOf(cost: Cost): number | null {
    return this.creditsPerUsd === null ? null : cost.amount * this.creditsPerUsd
  }

  override canRun(binding: EngineBinding): boolean {
    return (
      binding.adapter === this.key ||
      (binding.adapter === hostedModelAdapter && this.forms.length > 0)
    )
  }

  override async formOf(binding: EngineBinding): Promise<ModelForm | null> {
    const model = hostedModelOf(binding)
    return this.forms.find((form) => form.model === model) ?? null
  }

  override async listModels(): Promise<readonly HostedModel[]> {
    return this.forms.map((form) => ({
      id: form.model,
      provider: form.model.split("/")[0] ?? "",
      takes: ["text"],
      makes: ["image"],
      form,
    }))
  }

  override async priceOf(
    _binding: EngineBinding,
    request: PriceRequest
  ): Promise<RunPrice> {
    this.priced.push(request)
    return this.price
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
      ref: this.refByKey
        ? `fake-${request.idempotencyKey}`
        : `fake-${this.submitted.length}`,
      models: ["fake-model"],
      workflowHash: null,
      ...(this.finished === null ? {} : { finished: this.finished }),
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
    const error = this.outputErrors.shift()
    if (error !== undefined) {
      throw error
    }
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
