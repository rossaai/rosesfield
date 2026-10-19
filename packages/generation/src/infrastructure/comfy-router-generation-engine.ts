import type {
  Cost,
  EngineBinding,
  KeyCheck,
  RunInputs,
} from "@rosesfield/contract"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { ModelNotFoundError } from "#domain/error/model-not-found.error"
import { RunFailedError } from "#domain/error/run-failed.error"
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
import {
  CreditMeter,
  costOfCredits,
  creditsOfCost,
  type MeterTicket,
} from "#infrastructure/credit-meter"
import { bodyOf } from "#infrastructure/router/router-body"
import type {
  CatalogEntry,
  RouterCatalog,
} from "#infrastructure/router/router-catalog"
import { failureOf } from "#infrastructure/router/router-errors"
import { RouterHttp } from "#infrastructure/router/router-http"
import {
  type OutputRead,
  outputsOf,
  urlsWritten,
} from "#infrastructure/router/router-outputs"
import { placeholdersOf } from "#infrastructure/router/router-placeholders"
import { priceFromRates } from "#infrastructure/router/router-rates"

type ComfyRouterGenerationEngineOptions = {
  apiKey: string | null
  catalog: RouterCatalog
  meter?: CreditMeter
  fetch?: Fetch
  requestTimeoutMs?: number
  downloadTimeoutMs?: number
}

type Ref = { model: string; requestId: string; isNow: boolean }

export class ComfyRouterGenerationEngine extends GenerationEngine {
  static readonly routerUrl = RouterHttp.routerUrl
  static readonly creditsPerUsd = CreditMeter.creditsPerUsd
  static readonly requestTimeoutMs = 30_000
  static readonly downloadTimeoutMs = 300_000

  override readonly key = "comfy-router"
  override readonly origin = "live"
  override readonly idempotency = "keyed"

  private readonly http: RouterHttp
  private readonly catalog: RouterCatalog
  private readonly meter: CreditMeter | null

  constructor(options: ComfyRouterGenerationEngineOptions) {
    super()
    this.catalog = options.catalog
    this.meter = options.meter ?? null
    this.http = new RouterHttp({
      apiKey: options.apiKey,
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
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
    const body = bodyOf(entry.form, request.inputs, request.files)
    const ticket = (await this.meter?.start(this.http)) ?? null
    try {
      return entry.facts.answersBytes
        ? await this.runNow(entry, request, body, ticket)
        : await this.queue(entry, request, body, ticket)
    } catch (error) {
      this.meter?.drop(ticket)
      throw error
    }
  }

  override creditsOf(cost: Cost): number {
    return creditsOfCost(cost)
  }

  override async read(ref: string): Promise<EngineStatus> {
    const parsed = parseRef(ref)
    if (parsed.isNow) {
      return { state: "succeeded" }
    }
    const state = await this.http.status(parsed.model, parsed.requestId)
    if (state.status !== "COMPLETED") {
      return {
        state: state.status === "IN_QUEUE" ? "queued" : "running",
        progress: null,
        retryAfterSeconds: state.retryAfterSeconds,
      }
    }
    if (state.errorType !== null) {
      this.meter?.dropRef(ref)
    }
    if (state.errorType === "cancelled") {
      return { state: "cancelled" }
    }
    if (state.errorType !== null) {
      return { state: "failed", error: failureOf(state.errorType, 200, state) }
    }
    const credits = (await this.meter?.finishRef(this.http, ref)) ?? null
    return { state: "succeeded", cost: costOfCredits(credits) }
  }

  override async listOutputs(
    ref: string,
    inputs: RunInputs
  ): Promise<EngineOutput[]> {
    const parsed = parseRef(ref)
    if (parsed.isNow) {
      throw new RunFailedError({
        cause: "a synchronous run keeps its outputs at submit",
      })
    }
    const response = await this.http.result(parsed.model, parsed.requestId)
    if (response === null) {
      throw new EngineUnavailableError({ cause: "the result is not ready" })
    }
    const entry = await this.catalog.entry(this.http, parsed.model)
    if (entry === null) {
      throw new ModelNotFoundError({ model: parsed.model })
    }
    return outputsOf(response, this.readOf(entry, { inputs }))
  }

  override async cancel(ref: string): Promise<void> {
    this.meter?.dropRef(ref)
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

  private async runNow(
    entry: CatalogEntry,
    request: EngineRequest,
    body: unknown,
    ticket: MeterTicket | null
  ): Promise<EngineSubmission> {
    const model = entry.facts.model
    const response = await this.http.runNow(model, body, request.idempotencyKey)
    const outputs = await outputsOf(response, this.readOf(entry, request))
    const metered = (await this.meter?.finish(this.http, ticket)) ?? null
    return {
      ref: refText({ model, requestId: request.idempotencyKey, isNow: true }),
      models: [model],
      workflowHash: null,
      finished: {
        outputs,
        cost: costOfCredits(metered ?? creditsOf(response)),
      },
    }
  }

  private async queue(
    entry: CatalogEntry,
    request: EngineRequest,
    body: unknown,
    ticket: MeterTicket | null
  ): Promise<EngineSubmission> {
    const model = entry.facts.model
    const requestId = await this.http.submit(
      model,
      body,
      request.idempotencyKey
    )
    const ref = refText({ model, requestId, isNow: false })
    this.meter?.bind(ticket, ref)
    return { ref, models: [model], workflowHash: null }
  }

  private readOf(
    entry: CatalogEntry,
    request: { inputs: RunInputs }
  ): OutputRead {
    return {
      paths: entry.outputs,
      written: urlsWritten(request.inputs),
      download: (url) => this.http.download(url),
    }
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
      const placed = await placeholdersOf(entry.form, request.inputs)
      const body = bodyOf(entry.form, placed.inputs, placed.files)
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

function creditsOf(response: Response): number | null {
  const credits = Number(response.headers.get("x-comfy-credits-used"))
  return Number.isFinite(credits) && credits > 0 ? credits : null
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
