import type { ComfyLow, RawEvent } from "@comfyorg/sdk/low"
import type { Cost, EngineBinding, KeyCheck } from "@rosesfield/contract"
import {
  type EngineFiles,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type OutputsPerJob,
  type Pause,
  pauseOn,
} from "#domain/generation-engine.port"
import {
  callComfy,
  jobFailureOf,
  keyCheckOf,
} from "#infrastructure/comfy/comfy-errors"
import { uploadedValuesOf } from "#infrastructure/comfy/comfy-held-files"
import {
  type Job,
  type JobOutput,
  outputSchema,
  parseJob,
  readingOf,
} from "#infrastructure/comfy/comfy-job"
import { createComfyLow, type Fetch } from "#infrastructure/comfy/comfy-low"
import {
  isGlb,
  meshMime,
  meshOutputOf,
  mimeOf,
  outputKindOf,
} from "#infrastructure/comfy/comfy-media"
import { applyBindings } from "#infrastructure/comfy/comfy-value-binding"
import {
  addVideoStills,
  withVideoStills,
} from "#infrastructure/comfy/comfy-video-stills"
import {
  comfyWorkflowAdapter,
  parseComfyWorkflow,
  resultNodesOf,
  runsPartnerNode,
  workflowHashOf,
} from "#infrastructure/comfy/comfy-workflow-binding"
import {
  type BalanceReader,
  type CreditMeter,
  costOfCredits,
  creditsOfCost,
} from "#infrastructure/credit-meter"
import { mediaSizeOf } from "#infrastructure/media-size"
import { RouterHttp } from "#infrastructure/router/router-http"
import { type Timer, TimerJobRunner } from "#infrastructure/timer-job-runner"

type ComfyGenerationEngineOptions = {
  apiKey: string | null
  baseUrl?: string
  meter?: CreditMeter
  fetch?: Fetch
  requestTimeoutMs?: number
  downloadTimeoutMs?: number
  timer?: Timer
  files?: EngineFiles
}

type Fetched = Map<string, Promise<EngineOutput | null>>

type PartnerKey = { api_key_comfy_org: string }

export class ComfyGenerationEngine extends GenerationEngine {
  static readonly cloudUrl = "https://cloud.comfy.org"
  static readonly requestTimeoutMs = 30_000
  static readonly downloadTimeoutMs = 300_000
  static readonly unknownJobId = "00000000-0000-0000-0000-000000000000"
  static readonly gpuCreditsPerSecond = 0.266
  static readonly statusEveryMs = 2000
  static readonly heldRefs = 8
  static readonly outputKinds: readonly string[] = [
    "image",
    "video",
    "audio",
    "text",
    "3d",
  ]

  override readonly key = comfyWorkflowAdapter
  override readonly origin = "live"
  override readonly idempotency = "keyed"

  private readonly low: ComfyLow
  private readonly partnerKey: PartnerKey | null
  private readonly requestTimeoutMs: number
  private readonly downloadTimeoutMs: number
  private readonly isCloud: boolean
  private readonly meter: CreditMeter | null
  private readonly balance: BalanceReader
  private readonly pause: Pause
  private readonly files: EngineFiles | null
  private readonly terminal = new Map<string, Job>()
  private readonly fetched = new Map<string, Fetched>()
  private readonly partnerRefs = new Map<string, true>()

  constructor(options: ComfyGenerationEngineOptions) {
    super()
    const baseUrl = options.baseUrl ?? ComfyGenerationEngine.cloudUrl
    const send = options.fetch ?? ((input, init) => fetch(input, init))
    this.isCloud = baseUrl === ComfyGenerationEngine.cloudUrl
    this.requestTimeoutMs =
      options.requestTimeoutMs ?? ComfyGenerationEngine.requestTimeoutMs
    this.low = createComfyLow({
      baseUrl,
      apiKey: options.apiKey,
      fetch: send,
      timeoutMs: this.requestTimeoutMs,
    })
    this.partnerKey =
      options.apiKey === null ? null : { api_key_comfy_org: options.apiKey }
    this.downloadTimeoutMs =
      options.downloadTimeoutMs ?? ComfyGenerationEngine.downloadTimeoutMs
    this.meter = this.isCloud ? (options.meter ?? null) : null
    this.balance = new RouterHttp({
      apiKey: options.apiKey,
      fetch: send,
      timeoutMs: this.requestTimeoutMs,
      downloadTimeoutMs: this.downloadTimeoutMs,
    })
    this.pause = pauseOn((options.timer ?? TimerJobRunner.systemTimer).after)
    this.files = options.files ?? null
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === comfyWorkflowAdapter
  }

  override outputsPerJob(binding: EngineBinding): OutputsPerJob {
    return parseComfyWorkflow(binding).outputsPerJob
  }

  override resultNodesOf(binding: EngineBinding): readonly string[] | null {
    return resultNodesOf(binding)
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const config = parseComfyWorkflow(request.binding)
    const workflow = applyBindings(config.workflow, config.bindings, {
      adapter: this.key,
      request,
      createMissing: false,
      ...(await uploadedValuesOf(this.low, this.files, request, config)),
    })
    const isPartner = runsPartnerNode(config)
    const ticket = (await this.meter?.start(this.balance)) ?? null
    let job: Job
    try {
      job = await this.post(addVideoStills(workflow), {
        idempotencyKey: request.idempotencyKey,
        isPartner,
      })
    } catch (error) {
      this.meter?.drop(ticket)
      throw error
    }
    this.meter?.bind(ticket, job.id)
    if (isPartner) {
      keepAtMost(this.partnerRefs, job.id, true)
    }
    return {
      ref: job.id,
      models: config.models ?? [],
      workflowHash: await workflowHashOf(config.workflow),
    }
  }

  override submitLimitMs(): number {
    return (this.meter === null ? 2 : 3) * this.requestTimeoutMs
  }

  override creditsOf(cost: Cost): number {
    return creditsOfCost(cost)
  }

  override async read(ref: string): Promise<EngineStatus> {
    const job = parseJob(await callComfy(() => this.low.getJob(ref)))
    switch (job.status) {
      case "queued":
        return { state: "queued", progress: null, retryAfterSeconds: null }
      case "running":
      case "canceling":
        return {
          state: "running",
          progress: job.progress?.value ?? null,
          retryAfterSeconds: null,
        }
      case "succeeded":
        keepAtMost(this.terminal, ref, job)
        return this.succeeded(job)
      case "canceled":
        this.meter?.dropRef(ref)
        return { state: "cancelled" }
      case "failed":
      case "expired":
        this.meter?.dropRef(ref)
        return {
          state: "failed",
          error: jobFailureOf(job.error ?? { code: job.status }),
        }
    }
  }

  override async *watch(
    ref: string,
    signal: AbortSignal
  ): AsyncGenerator<EngineStatus, void, void> {
    let last: EngineStatus | null = null
    try {
      for await (const status of this.relay(ref, signal)) {
        last = status
        yield status
      }
    } finally {
      if (last?.state !== "succeeded") {
        this.fetched.delete(ref)
      }
    }
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    const job =
      this.terminal.get(ref) ??
      parseJob(await callComfy(() => this.low.getJob(ref)))
    const fetched = this.fetched.get(ref)
    this.terminal.delete(ref)
    this.fetched.delete(ref)
    const listed = job.outputs.filter(isKept)
    const outputs = await Promise.all(
      listed.map(
        async (output) =>
          (await fetched?.get(output.id)) ?? (await this.download(output))
      )
    )
    return withVideoStills(listed, outputs)
  }

  private async *relay(
    ref: string,
    signal: AbortSignal
  ): AsyncGenerator<EngineStatus, void, void> {
    const events = this.low.getJobEvents(ref, { signal })
    let opened = false
    let hasEnded = false
    let progress: number | null = null
    try {
      for await (const event of events) {
        opened = true
        this.fetchEarly(ref, event)
        const reading = readingOf(event, progress)
        if (reading === "ended") {
          hasEnded = true
          break
        }
        if (reading !== null) {
          progress = reading.state === "running" ? reading.progress : progress
          yield reading
        }
      }
    } catch {
      if (opened || signal.aborted) {
        return
      }
      yield* this.readEvery(ref, {
        everyMs: ComfyGenerationEngine.statusEveryMs,
        pause: this.pause,
        signal,
      })
      return
    }
    if (hasEnded) {
      yield await this.read(ref)
    }
  }

  override async cancel(ref: string): Promise<void> {
    this.meter?.dropRef(ref)
    await callComfy(() => this.low.cancelJob(ref))
  }

  override async checkKey(): Promise<KeyCheck> {
    try {
      await this.low.getJob(ComfyGenerationEngine.unknownJobId)
      return "valid"
    } catch (error) {
      return keyCheckOf(error)
    }
  }

  private async succeeded(job: Job): Promise<EngineStatus> {
    const meter = this.meter
    if (meter?.deferRef(job.id) === true) {
      return { state: "succeeded" }
    }
    const metered = (await meter?.finishRef(this.balance, job.id)) ?? null
    const isPartner = this.partnerRefs.delete(job.id)
    const credits =
      metered ?? (isPartner ? null : gpuCreditsOf(this.isCloud, job))
    return { state: "succeeded", cost: costOfCredits(credits) }
  }

  private fetchEarly(ref: string, event: RawEvent): void {
    if (event.event !== "output") {
      return
    }
    const parsed = outputSchema.safeParse(event.data)
    if (!parsed.success || !isKept(parsed.data)) {
      return
    }
    const fetched: Fetched = this.fetched.get(ref) ?? new Map()
    if (!fetched.has(parsed.data.id)) {
      fetched.set(
        parsed.data.id,
        this.download(parsed.data).catch(() => null)
      )
    }
    keepAtMost(this.fetched, ref, fetched)
  }

  private async post(
    workflow: Record<string, unknown>,
    options: { idempotencyKey: string; isPartner: boolean }
  ): Promise<Job> {
    const { idempotencyKey } = options
    const extraData = options.isPartner ? this.partnerKey : null
    return parseJob(
      await callComfy(() =>
        this.low.postJobs(
          workflow,
          extraData === null
            ? { idempotencyKey }
            : { idempotencyKey, extraData }
        )
      )
    )
  }

  private async download(output: JobOutput): Promise<EngineOutput> {
    const response = await callComfy(() =>
      this.low.getAssetContent(output.id, { timeoutMs: this.downloadTimeoutMs })
    )
    const bytes = new Uint8Array(await callComfy(() => response.arrayBuffer()))
    if (isGlb(bytes)) {
      return meshOutputOf(bytes)
    }
    const size = mediaSizeOf(bytes)
    return {
      nodeId: output.node_id,
      kind: outputKindOf(output.type, output.content_type),
      mime: mimeOf(output.content_type),
      bytes,
      width: size?.width ?? null,
      height: size?.height ?? null,
      durationSeconds: null,
    }
  }
}

function isKept(output: JobOutput): boolean {
  return (
    ComfyGenerationEngine.outputKinds.includes(output.type) ||
    mimeOf(output.content_type) === meshMime ||
    output.name.toLowerCase().endsWith(".glb")
  )
}

function keepAtMost<V>(map: Map<string, V>, ref: string, value: V): void {
  map.delete(ref)
  map.set(ref, value)
  for (const oldest of map.keys()) {
    if (map.size <= ComfyGenerationEngine.heldRefs) {
      return
    }
    map.delete(oldest)
  }
}

function gpuCreditsOf(isCloud: boolean, job: Job): number | null {
  const executionMs = job.metrics?.execution_ms ?? null
  if (!isCloud || executionMs === null) {
    return null
  }
  const credits =
    (executionMs / 1000) * ComfyGenerationEngine.gpuCreditsPerSecond
  return Math.round(credits * 1_000_000) / 1_000_000
}
