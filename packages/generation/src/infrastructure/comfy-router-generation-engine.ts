import type {
  Cost,
  EngineBinding,
  KeyCheck,
  RunInputs,
} from "@rosesfield/contract"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { ModelNotFoundError } from "#domain/error/model-not-found.error"
import {
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type HostedModel,
  type OutputsPerJob,
  type PriceRequest,
  type RunPrice,
  unknownPrice,
} from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import { hostedModelOf } from "#domain/task-binding"
import type { Fetch } from "#infrastructure/comfy/comfy-low"
import { bodyOf } from "#infrastructure/router/router-body"
import type {
  CatalogEntry,
  KeptResult,
  RouterCatalog,
} from "#infrastructure/router/router-catalog"
import { failureOf } from "#infrastructure/router/router-errors"
import { RouterHttp } from "#infrastructure/router/router-http"
import { outputsOf, urlsWritten } from "#infrastructure/router/router-outputs"
import { priceFromRates } from "#infrastructure/router/router-rates"

type ComfyRouterGenerationEngineOptions = {
  apiKey: string | null
  catalog: RouterCatalog
  fetch?: Fetch
  requestTimeoutMs?: number
  downloadTimeoutMs?: number
}

type Ref = { model: string; requestId: string; isNow: boolean }

export class ComfyRouterGenerationEngine extends GenerationEngine {
  static readonly routerUrl = RouterHttp.routerUrl
  static readonly creditsPerUsd = 211
  static readonly requestTimeoutMs = 30_000
  static readonly downloadTimeoutMs = 300_000

  override readonly key = "comfy-router"
  override readonly origin = "live"
  override readonly idempotency = "keyed"

  private readonly http: RouterHttp
  private readonly catalog: RouterCatalog
  private readonly results = new Map<string, KeptResult>()

  constructor(options: ComfyRouterGenerationEngineOptions) {
    super()
    this.catalog = options.catalog
    this.http = new RouterHttp({
      apiKey: options.apiKey,
      fetch: options.fetch ?? fetch,
      timeoutMs:
        options.requestTimeoutMs ??
        ComfyRouterGenerationEngine.requestTimeoutMs,
      downloadTimeoutMs:
        options.downloadTimeoutMs ??
        ComfyRouterGenerationEngine.downloadTimeoutMs,
    })
  }

  warmCatalog(): void {
    this.catalog.models(this.http).catch(() => undefined)
  }

  override checksKey(): boolean {
    return false
  }

  override canRun(binding: EngineBinding): boolean {
    return this.http.hasKey && hostedModelOf(binding) !== null
  }

  override outputsPerJob(_binding: EngineBinding): OutputsPerJob {
    return "all"
  }

  override async formOf(binding: EngineBinding): Promise<ModelForm | null> {
    const model = hostedModelOf(binding)
    if (model === null) {
      return null
    }
    return (await this.catalog.entry(this.http, model))?.form ?? null
  }

  override async listModels(): Promise<readonly HostedModel[]> {
    const entries = await this.catalog.models(this.http)
    return entries.map((entry) => ({
      id: entry.facts.model,
      provider: entry.facts.model.split("/")[0] ?? "",
      takes: entry.facts.takes,
      makes: entry.facts.makes,
      form: entry.form,
    }))
  }

  override async priceOf(
    binding: EngineBinding,
    request: PriceRequest
  ): Promise<RunPrice> {
    const entry = await this.entryOf(binding)
    const estimated = await this.estimate(entry, request)
    if (estimated !== null) {
      return estimated
    }
    try {
      const rows = await this.catalog.rateRows(this.http)
      const credits = priceFromRates(rows, entry.form, request.inputs)
      return credits === null ? unknownPrice : { source: "rates", credits }
    } catch {
      return unknownPrice
    }
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const entry = await this.entryOf(request.binding)
    const model = entry.facts.model
    const body = bodyOf(entry.form, request.inputs, request.files)
    if (entry.facts.answersBytes) {
      const response = await this.http.runNow(
        model,
        body,
        request.idempotencyKey
      )
      const ref = refText({
        model,
        requestId: request.idempotencyKey,
        isNow: true,
      })
      this.catalog.keepResult(ref, await keptOf(response))
      return { ref, models: [model], workflowHash: null }
    }
    const requestId = await this.http.submit(
      model,
      body,
      request.idempotencyKey
    )
    return {
      ref: refText({ model, requestId, isNow: false }),
      models: [model],
      workflowHash: null,
    }
  }

  override async read(ref: string): Promise<EngineStatus> {
    const parsed = parseRef(ref)
    if (parsed.isNow) {
      const kept = this.catalog.keptResult(ref)
      if (kept === null) {
        throw new EngineUnavailableError({ cause: "the result left the cache" })
      }
      return { state: "succeeded", cost: costOf(kept.credits) }
    }
    const state = await this.http.status(parsed.model, parsed.requestId)
    if (state.status !== "COMPLETED") {
      return {
        state: state.status === "IN_QUEUE" ? "queued" : "running",
        progress: null,
        retryAfterSeconds: state.retryAfterSeconds,
      }
    }
    if (state.errorType === "cancelled") {
      return { state: "cancelled" }
    }
    if (state.errorType !== null) {
      return { state: "failed", error: failureOf(state.errorType, 200, state) }
    }
    return this.collect(ref, parsed)
  }

  override async listOutputs(
    ref: string,
    inputs: RunInputs
  ): Promise<EngineOutput[]> {
    const parsed = parseRef(ref)
    const kept = this.results.get(ref) ?? this.catalog.keptResult(ref)
    const response =
      kept === null || kept === undefined
        ? await this.http.result(parsed.model, parsed.requestId)
        : responseOf(kept)
    if (response === null) {
      throw new EngineUnavailableError({ cause: "the result is not ready" })
    }
    const entry = await this.catalog.entry(this.http, parsed.model)
    if (entry === null) {
      throw new ModelNotFoundError({ model: parsed.model })
    }
    return outputsOf(response, {
      paths: entry.outputs,
      written: urlsWritten(inputs),
      download: (url) => this.http.download(url),
    })
  }

  override async cancel(ref: string): Promise<void> {
    const parsed = parseRef(ref)
    if (!parsed.isNow) {
      await this.http.cancel(parsed.model, parsed.requestId)
    }
  }

  override async checkKey(): Promise<KeyCheck> {
    try {
      const status = await this.http.probe()
      if (status === 401) {
        return "invalid"
      }
      return status === 200 || status === 403 ? "valid" : "unreachable"
    } catch {
      return "unreachable"
    }
  }

  private async collect(ref: string, parsed: Ref): Promise<EngineStatus> {
    const response = await this.http.result(parsed.model, parsed.requestId)
    if (response === null) {
      return { state: "running", progress: null, retryAfterSeconds: null }
    }
    const kept = await keptOf(response)
    this.results.set(ref, kept)
    return { state: "succeeded", cost: costOf(kept.credits) }
  }

  private async entryOf(binding: EngineBinding): Promise<CatalogEntry> {
    const model = hostedModelOf(binding) ?? ""
    const entry = await this.catalog.entry(this.http, model)
    if (entry === null) {
      throw new ModelNotFoundError({ model })
    }
    return entry
  }

  private async estimate(
    entry: CatalogEntry,
    request: PriceRequest
  ): Promise<RunPrice | null> {
    const keyTag = await this.http.keyTag()
    if (!this.http.hasKey || !this.catalog.hasEstimates(keyTag)) {
      return null
    }
    try {
      const body = bodyOf(entry.form, request.inputs, [])
      const answer = await this.http.estimate(entry.facts.model, body)
      if (answer.state === "not-enabled") {
        this.catalog.markEstimatesOff(keyTag)
        return null
      }
      return answer.credits === null
        ? null
        : { source: "estimate", credits: answer.credits }
    } catch {
      return null
    }
  }
}

async function keptOf(response: Response): Promise<KeptResult> {
  const credits = Number(response.headers.get("x-comfy-credits-used"))
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
    credits: Number.isFinite(credits) && credits > 0 ? credits : null,
  }
}

function responseOf(kept: KeptResult): Response {
  return new Response(new Uint8Array(kept.bytes), {
    headers:
      kept.contentType === null ? {} : { "content-type": kept.contentType },
  })
}

function costOf(credits: number | null): Cost | null {
  return credits === null
    ? null
    : {
        amount: credits / ComfyRouterGenerationEngine.creditsPerUsd,
        currency: "USD",
      }
}

function refText(ref: Ref): string {
  return `${ref.model}|${ref.isNow ? "now" : "queued"}|${ref.requestId}`
}

function parseRef(ref: string): Ref {
  const [model, mode, requestId] = ref.split("|")
  if (model === undefined || requestId === undefined) {
    throw new EngineUnavailableError({ cause: `a ref with no model: ${ref}` })
  }
  return { model, requestId, isNow: mode === "now" }
}
