import type { ComfyLow, RawEvent } from "@comfyorg/sdk/low"
import type {
  AssetKind,
  Cost,
  EngineBinding,
  KeyCheck,
} from "@rosesfield/contract"
import { z } from "zod"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import {
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
import {
  createComfyLow,
  type Fetch,
  uploadComfyInputs,
} from "#infrastructure/comfy/comfy-low"
import { mediaKindOf, mimeOf } from "#infrastructure/comfy/comfy-media"
import { applyBindings } from "#infrastructure/comfy/comfy-value-binding"
import {
  addVideoStills,
  withVideoStills,
} from "#infrastructure/comfy/comfy-video-stills"
import {
  comfyWorkflowAdapter,
  parseComfyWorkflow,
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
}

type EventReading = EngineStatus | "ended" | null

const jobSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "queued",
    "running",
    "succeeded",
    "canceling",
    "canceled",
    "failed",
    "expired",
  ]),
  progress: z.object({ value: z.number().min(0).max(1) }).nullish(),
  metrics: z.object({ execution_ms: z.number().min(0).nullish() }).nullish(),
  outputs: z
    .array(
      z.object({
        id: z.string().min(1),
        node_id: z.string(),
        name: z.string().default(""),
        type: z.string(),
        content_type: z.string(),
      })
    )
    .default([]),
  error: z
    .object({
      code: z.string(),
      message: z.string().nullish(),
      node_id: z.string().nullish(),
      class_type: z.string().nullish(),
      node_errors: z.record(z.string(), z.unknown()).optional(),
    })
    .nullish(),
})

type Job = z.infer<typeof jobSchema>

const statusEvent = z.object({ status: jobSchema.shape.status })

const progressEvent = z.object({ value: z.number().min(0).max(1) })

export class ComfyGenerationEngine extends GenerationEngine {
  static readonly cloudUrl = "https://cloud.comfy.org"
  static readonly requestTimeoutMs = 30_000
  static readonly downloadTimeoutMs = 300_000
  static readonly unknownJobId = "00000000-0000-0000-0000-000000000000"
  static readonly gpuCreditsPerSecond = 0.266
  static readonly statusEveryMs = 2000
  static readonly outputKinds: readonly string[] = [
    "image",
    "video",
    "audio",
    "text",
  ]

  override readonly key = comfyWorkflowAdapter
  override readonly origin = "live"
  override readonly idempotency = "keyed"

  private readonly low: ComfyLow
  private readonly requestTimeoutMs: number
  private readonly downloadTimeoutMs: number
  private readonly isCloud: boolean
  private readonly meter: CreditMeter | null
  private readonly balance: BalanceReader
  private readonly pause: Pause

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
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === comfyWorkflowAdapter
  }

  override outputsPerJob(binding: EngineBinding): OutputsPerJob {
    return parseComfyWorkflow(binding).outputsPerJob
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const config = parseComfyWorkflow(request.binding)
    const uploaded = await uploadComfyInputs(this.low, request.files)
    const workflow = applyBindings(config.workflow, config.bindings, {
      adapter: this.key,
      request,
      createMissing: false,
      assetValue: (assetId) => {
        const id = uploaded.get(assetId)
        if (id === undefined) {
          throw new RunFailedError({ cause: assetId })
        }
        return { __type: "core/ASSET", info: { id } }
      },
    })
    const ticket = (await this.meter?.start(this.balance)) ?? null
    let job: Job
    try {
      job = await this.post(addVideoStills(workflow), request.idempotencyKey)
    } catch (error) {
      this.meter?.drop(ticket)
      throw error
    }
    this.meter?.bind(ticket, job.id)
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
    const events = this.low.getJobEvents(ref, { signal })
    let opened = false
    let hasEnded = false
    let progress: number | null = null
    try {
      for await (const event of events) {
        opened = true
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

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    const job = parseJob(await callComfy(() => this.low.getJob(ref)))
    const listed = job.outputs.filter((output) =>
      ComfyGenerationEngine.outputKinds.includes(output.type)
    )
    const outputs = await Promise.all(
      listed.map((output) => this.download(output))
    )
    return withVideoStills(listed, outputs)
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
    const metered = (await this.meter?.finishRef(this.balance, job.id)) ?? null
    const credits = metered ?? gpuCreditsOf(this.isCloud, job)
    return credits === null
      ? { state: "succeeded" }
      : { state: "succeeded", cost: costOfCredits(credits) }
  }

  private async post(
    workflow: Record<string, unknown>,
    idempotencyKey: string
  ): Promise<Job> {
    return parseJob(
      await callComfy(() => this.low.postJobs(workflow, { idempotencyKey }))
    )
  }

  private async download(
    output: Job["outputs"][number]
  ): Promise<EngineOutput> {
    const response = await callComfy(() =>
      this.low.getAssetContent(output.id, { timeoutMs: this.downloadTimeoutMs })
    )
    const bytes = new Uint8Array(await callComfy(() => response.arrayBuffer()))
    const size = mediaSizeOf(bytes)
    return {
      kind: kindOf(output.type, output.content_type),
      mime: mimeOf(output.content_type),
      bytes,
      width: size?.width ?? null,
      height: size?.height ?? null,
      durationSeconds: null,
    }
  }
}

function readingOf(event: RawEvent, progress: number | null): EventReading {
  if (event.event === "error") {
    return "ended"
  }
  if (event.event === "progress") {
    const progress = progressEvent.safeParse(event.data)
    return progress.success
      ? {
          state: "running",
          progress: progress.data.value,
          retryAfterSeconds: null,
        }
      : null
  }
  if (event.event !== "status") {
    return null
  }
  const status = statusEvent.safeParse(event.data)
  if (!status.success) {
    return null
  }
  switch (status.data.status) {
    case "queued":
      return { state: "queued", progress: null, retryAfterSeconds: null }
    case "running":
    case "canceling":
      return { state: "running", progress, retryAfterSeconds: null }
    default:
      return "ended"
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

function parseJob(value: unknown): Job {
  const result = jobSchema.safeParse(value)
  if (!result.success) {
    throw new EngineUnavailableError({ cause: result.error })
  }
  return result.data
}

function kindOf(type: string, contentType: string): AssetKind {
  return type === "video" || type === "audio" || type === "text"
    ? type
    : (mediaKindOf(mimeOf(contentType)) ?? "image")
}
