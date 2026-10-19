import type { ComfyLow } from "@comfyorg/sdk/low"
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
  comfyWorkflowAdapter,
  parseComfyWorkflow,
  workflowHashOf,
} from "#infrastructure/comfy/comfy-workflow-binding"
import { costOfCredits, creditsOfCost } from "#infrastructure/credit-meter"

type ComfyGenerationEngineOptions = {
  apiKey: string | null
  baseUrl?: string
  fetch?: Fetch
  requestTimeoutMs?: number
  downloadTimeoutMs?: number
}

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
        type: z.string(),
        content_type: z.string(),
      })
    )
    .default([]),
  error: z
    .object({
      code: z.string(),
      node_errors: z.record(z.string(), z.unknown()).optional(),
    })
    .nullish(),
})

type Job = z.infer<typeof jobSchema>

export class ComfyGenerationEngine extends GenerationEngine {
  static readonly cloudUrl = "https://cloud.comfy.org"
  static readonly requestTimeoutMs = 30_000
  static readonly downloadTimeoutMs = 300_000
  static readonly unknownJobId = "00000000-0000-0000-0000-000000000000"
  static readonly gpuCreditsPerSecond = 0.266
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
  private readonly downloadTimeoutMs: number
  private readonly isCloud: boolean

  constructor(options: ComfyGenerationEngineOptions) {
    super()
    const baseUrl = options.baseUrl ?? ComfyGenerationEngine.cloudUrl
    this.isCloud = baseUrl === ComfyGenerationEngine.cloudUrl
    this.low = createComfyLow({
      baseUrl,
      apiKey: options.apiKey,
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      timeoutMs:
        options.requestTimeoutMs ?? ComfyGenerationEngine.requestTimeoutMs,
    })
    this.downloadTimeoutMs =
      options.downloadTimeoutMs ?? ComfyGenerationEngine.downloadTimeoutMs
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
    const job = await this.post(workflow, request.idempotencyKey)
    return {
      ref: job.id,
      models: config.models ?? [],
      workflowHash: await workflowHashOf(config.workflow),
    }
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
        return { state: "succeeded", cost: this.costOf(job) }
      case "canceled":
        return { state: "cancelled" }
      case "failed":
      case "expired":
        return {
          state: "failed",
          error: jobFailureOf(
            job.error?.code ?? job.status,
            job.error?.node_errors !== undefined
          ),
        }
    }
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    const job = parseJob(await callComfy(() => this.low.getJob(ref)))
    return Promise.all(
      job.outputs
        .filter((output) =>
          ComfyGenerationEngine.outputKinds.includes(output.type)
        )
        .map((output) => this.download(output))
    )
  }

  override async cancel(ref: string): Promise<void> {
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

  private costOf(job: Job): Cost | null {
    const executionMs = job.metrics?.execution_ms ?? null
    if (!this.isCloud || executionMs === null) {
      return null
    }
    const credits =
      (executionMs / 1000) * ComfyGenerationEngine.gpuCreditsPerSecond
    return costOfCredits(Math.round(credits * 1_000_000) / 1_000_000)
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
    return {
      kind: kindOf(output.type, output.content_type),
      mime: mimeOf(output.content_type),
      bytes,
      width: null,
      height: null,
      durationSeconds: null,
    }
  }
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
