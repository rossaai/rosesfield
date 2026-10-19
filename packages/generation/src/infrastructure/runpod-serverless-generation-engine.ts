import type { EngineBinding, KeyCheck } from "@rosesfield/contract"
import { z } from "zod"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import { RunInputRefusedError } from "#domain/error/run-input-refused.error"
import {
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type OutputsPerJob,
} from "#domain/generation-engine.port"
import type { Fetch } from "#infrastructure/comfy/comfy-low"
import { extensionOf } from "#infrastructure/comfy/comfy-media"
import { applyBindings } from "#infrastructure/comfy/comfy-value-binding"
import {
  comfyWorkflowAdapter,
  parseComfyWorkflow,
  workflowHashOf,
} from "#infrastructure/comfy/comfy-workflow-binding"
import { jsonOf, sendRunPod } from "#infrastructure/runpod/runpod-http"
import {
  base64Of,
  bytesOfBase64,
  mediaTypeOf,
} from "#infrastructure/runpod/runpod-media"

type RunPodServerlessGenerationEngineOptions = {
  apiKey: string
  endpointId: string
  apiUrl?: string
  fetch?: Fetch
  requestTimeoutMs?: number
  downloadTimeoutMs?: number
  executionTimeoutMs?: number
}

const submitted = z.object({ id: z.string().min(1) })

const jobSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "IN_QUEUE",
    "IN_PROGRESS",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "TIMED_OUT",
  ]),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
})

const outputSchema = z.object({
  images: z
    .array(
      z.object({
        filename: z.string().min(1),
        type: z.enum(["base64", "s3_url"]),
        data: z.string().min(1),
      })
    )
    .default([]),
})

type OutputFile = z.infer<typeof outputSchema>["images"][number]

export class RunPodServerlessGenerationEngine extends GenerationEngine {
  static readonly apiUrl = "https://api.runpod.ai/v2"
  static readonly requestTimeoutMs = 30_000
  static readonly downloadTimeoutMs = 300_000
  static readonly executionTimeoutMs = 600_000
  static readonly maxPayloadBytes = 10_000_000

  override readonly key = "runpod-serverless"
  override readonly origin = "live"
  override readonly idempotency = "none"

  private readonly apiKey: string
  private readonly endpointUrl: string
  private readonly send: Fetch
  private readonly requestTimeoutMs: number
  private readonly downloadTimeoutMs: number
  private readonly executionTimeoutMs: number

  constructor(options: RunPodServerlessGenerationEngineOptions) {
    super()
    const apiUrl = options.apiUrl ?? RunPodServerlessGenerationEngine.apiUrl
    this.apiKey = options.apiKey
    this.endpointUrl = `${apiUrl}/${encodeURIComponent(options.endpointId)}`
    this.send = options.fetch ?? fetch
    this.requestTimeoutMs =
      options.requestTimeoutMs ??
      RunPodServerlessGenerationEngine.requestTimeoutMs
    this.downloadTimeoutMs =
      options.downloadTimeoutMs ??
      RunPodServerlessGenerationEngine.downloadTimeoutMs
    this.executionTimeoutMs =
      options.executionTimeoutMs ??
      RunPodServerlessGenerationEngine.executionTimeoutMs
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === comfyWorkflowAdapter
  }

  override outputsPerJob(binding: EngineBinding): OutputsPerJob {
    return parseComfyWorkflow(binding).outputsPerJob
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const config = parseComfyWorkflow(request.binding)
    const names = new Map<string, string>(
      request.files.map((file) => [
        file.assetId,
        `${file.assetId}.${extensionOf(file.mime)}`,
      ])
    )
    const workflow = applyBindings(config.workflow, config.bindings, {
      adapter: this.key,
      request,
      createMissing: false,
      assetValue: (assetId) => {
        const name = names.get(assetId)
        if (name === undefined) {
          throw new RunFailedError({ cause: assetId })
        }
        return name
      },
    })
    const body = this.bodyOf(request, workflow, names)
    const response = await this.call("POST", "/run", body)
    const answer = submitted.safeParse(await jsonOf(response))
    if (!answer.success) {
      throw new EngineUnavailableError({ cause: answer.error })
    }
    return {
      ref: answer.data.id,
      models: config.models ?? [],
      workflowHash: await workflowHashOf(config.workflow),
    }
  }

  override async read(ref: string): Promise<EngineStatus> {
    const job = await this.status(ref)
    switch (job.status) {
      case "IN_QUEUE":
        return { state: "queued", progress: null, retryAfterSeconds: null }
      case "IN_PROGRESS":
        return { state: "running", progress: null, retryAfterSeconds: null }
      case "COMPLETED":
        return { state: "succeeded" }
      case "CANCELLED":
        return { state: "cancelled" }
      case "FAILED":
      case "TIMED_OUT":
        return {
          state: "failed",
          error: new RunFailedError({ cause: job.error ?? job.status }),
        }
    }
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    const job = await this.status(ref)
    const output = outputSchema.safeParse(job.output ?? {})
    if (!output.success) {
      throw new EngineUnavailableError({ cause: output.error })
    }
    const files = output.data.images.flatMap((file) => {
      const type = mediaTypeOf(file.filename)
      return type === null ? [] : [{ file, ...type }]
    })
    return Promise.all(
      files.map(async ({ file, kind, mime }) => ({
        kind,
        mime,
        bytes: await this.bytesOf(file),
        width: null,
        height: null,
        durationSeconds: null,
      }))
    )
  }

  override async cancel(ref: string): Promise<void> {
    await this.call("POST", `/cancel/${encodeURIComponent(ref)}`)
  }

  override async checkKey(): Promise<KeyCheck> {
    let response: Response
    try {
      response = await this.send(`${this.endpointUrl}/health`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      })
    } catch {
      return "unreachable"
    }
    await response.body?.cancel()
    if (response.ok) {
      return "valid"
    }
    return [401, 403, 404].includes(response.status) ? "invalid" : "unreachable"
  }

  private bodyOf(
    request: EngineRequest,
    workflow: Record<string, unknown>,
    names: ReadonlyMap<string, string>
  ): string {
    const images = request.files.map((file) => ({
      name: names.get(file.assetId) ?? file.assetId,
      image: base64Of(file.bytes),
    }))
    const timeoutMs =
      request.timeoutSeconds === undefined
        ? this.executionTimeoutMs
        : request.timeoutSeconds * 1000
    const body = JSON.stringify({
      input: { workflow, ...(images.length === 0 ? {} : { images }) },
      policy: { executionTimeout: timeoutMs, ttl: timeoutMs },
    })
    const size = new TextEncoder().encode(body).length
    if (size > RunPodServerlessGenerationEngine.maxPayloadBytes) {
      throw new RunInputRefusedError({ cause: `a ${size} byte request` })
    }
    return body
  }

  private async status(ref: string): Promise<z.infer<typeof jobSchema>> {
    const response = await this.call(
      "GET",
      `/status/${encodeURIComponent(ref)}`
    )
    const job = jobSchema.safeParse(await jsonOf(response))
    if (!job.success) {
      throw new EngineUnavailableError({ cause: job.error })
    }
    return job.data
  }

  private async bytesOf(file: OutputFile): Promise<Uint8Array> {
    if (file.type === "base64") {
      try {
        return bytesOfBase64(file.data)
      } catch (error) {
        throw new EngineUnavailableError({ cause: error })
      }
    }
    try {
      const response = await this.send(file.data, {
        signal: AbortSignal.timeout(this.downloadTimeoutMs),
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new EngineUnavailableError({ cause: response.status })
      }
      return new Uint8Array(await response.arrayBuffer())
    } catch (error) {
      throw error instanceof EngineUnavailableError
        ? error
        : new EngineUnavailableError({ cause: error })
    }
  }

  private call(
    method: "GET" | "POST",
    path: string,
    body?: string
  ): Promise<Response> {
    return sendRunPod({
      fetch: this.send,
      url: `${this.endpointUrl}${path}`,
      method,
      apiKey: this.apiKey,
      ...(body === undefined ? {} : { body }),
      timeoutMs: this.requestTimeoutMs,
    })
  }
}
