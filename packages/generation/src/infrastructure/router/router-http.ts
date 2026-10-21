import { EngineKeyInvalidError } from "#domain/error/engine-key-invalid.error"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import type { Fetch } from "#infrastructure/comfy/comfy-low"
import {
  refusalOf,
  retryAfterOf,
  routerErrorOf,
} from "#infrastructure/router/router-errors"
import {
  arrayOf,
  fieldOf,
  numberOf,
  stringOf,
} from "#infrastructure/router/router-json"

export type RouterHttpOptions = {
  apiKey: string | null
  fetch: Fetch
  timeoutMs: number
  downloadTimeoutMs: number
}

export type CatalogPage = {
  ids: string[]
  next: string | null
}

export type SchemaRead =
  | { state: "fresh"; etag: string | null; document: unknown }
  | { state: "same" }

export type QueueState = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED"
  errorType: string | null
  retryAfterSeconds: number | null
}

export type Estimate =
  | { state: "priced"; credits: number | null }
  | {
      state: "not-enabled"
    }

export class RouterHttp {
  static readonly routerUrl = "https://api.comfy.org"
  static readonly docsUrl = "https://docs.comfy.org"
  static readonly ratesUrl =
    "https://raw.githubusercontent.com/Comfy-Org/docs/main/router-pricing/metronome-rates.json"
  static readonly pageSize = 100

  static readonly publicTag = "public"

  private readonly options: RouterHttpOptions
  private tag: Promise<string> | null = null

  constructor(options: RouterHttpOptions) {
    this.options = options
  }

  get requestTimeoutMs(): number {
    return this.options.timeoutMs
  }

  get downloadTimeoutMs(): number {
    return this.options.downloadTimeoutMs
  }

  get hasKey(): boolean {
    return this.options.apiKey !== null
  }

  keyTag(): Promise<string> {
    this.tag ??= tagOf(this.options.apiKey)
    return this.tag
  }

  async listPage(cursor: string | null): Promise<CatalogPage> {
    const query = new URLSearchParams({ limit: String(RouterHttp.pageSize) })
    if (cursor !== null) {
      query.set("cursor", cursor)
    }
    const body = await this.json("GET", `/v2/models?${query}`, "catalog")
    return pageOf(body)
  }

  async probe(): Promise<number> {
    const response = await this.raw("GET", "/v2/models?limit=1")
    return response.status
  }

  async readSchema(model: string, etag: string | null): Promise<SchemaRead> {
    const headers = etag === null ? undefined : { "If-None-Match": etag }
    const response = await this.send(
      "GET",
      `${modelPath(model)}/openapi.json`,
      model,
      { headers }
    )
    if (response.status === 304) {
      return { state: "same" }
    }
    return {
      state: "fresh",
      etag: response.headers.get("etag"),
      document: await response.json(),
    }
  }

  async readPublicIndex(): Promise<string[]> {
    const text = await this.publicText(`${RouterHttp.docsUrl}/llms.txt`)
    const found = text.matchAll(
      /\/router-schemas\/([a-z0-9][a-z0-9_.-]*)\/([A-Za-z0-9][A-Za-z0-9_.-]*?)\.json/g
    )
    return [...new Set([...found].map((match) => `${match[1]}/${match[2]}`))]
  }

  async readPublicSchema(model: string): Promise<unknown> {
    const text = await this.publicText(
      `${RouterHttp.docsUrl}/router-schemas/${model}.json`
    )
    return JSON.parse(text)
  }

  async balance(): Promise<number> {
    const body = await this.json("GET", "/customers/balance", "balance")
    const cents = numberOf(fieldOf(body, "amount_cents"))
    if (cents === null) {
      throw new EngineUnavailableError({ cause: "a balance with no cents" })
    }
    return cents
  }

  async readRates(): Promise<unknown> {
    return JSON.parse(await this.publicText(RouterHttp.ratesUrl))
  }

  async estimate(model: string, body: unknown): Promise<Estimate> {
    const response = await this.raw("POST", `${modelPath(model)}/estimate`, {
      body: JSON.stringify(body),
    })
    if (response.ok) {
      const credits = numberOf(fieldOf(await response.json(), "credits"))
      return { state: "priced", credits }
    }
    const refusal = await refusalOf(response, model)
    if (refusal.errorType === "not_enabled") {
      return { state: "not-enabled" }
    }
    throw routerErrorOf(refusal)
  }

  async submit(model: string, body: unknown, key: string): Promise<string> {
    const answer = await this.json(
      "POST",
      `${modelPath(model)}/requests`,
      model,
      { body: JSON.stringify(body), headers: { "Idempotency-Key": key } }
    )
    const requestId = stringOf(fieldOf(answer, "request_id"))
    if (requestId === null) {
      throw new EngineUnavailableError({ cause: "no request_id" })
    }
    return requestId
  }

  async runNow(model: string, body: unknown, key: string): Promise<Response> {
    return this.send("POST", modelPath(model), model, {
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": key },
      timeoutMs: this.options.downloadTimeoutMs,
    })
  }

  async status(model: string, requestId: string): Promise<QueueState> {
    const response = await this.send(
      "GET",
      `${requestPath(model, requestId)}/status`,
      model
    )
    const body = await response.json()
    const status = stringOf(fieldOf(body, "status"))
    if (
      status !== "IN_QUEUE" &&
      status !== "IN_PROGRESS" &&
      status !== "COMPLETED"
    ) {
      throw new EngineUnavailableError({ cause: `status ${status}` })
    }
    return {
      status,
      errorType: stringOf(fieldOf(body, "error_type")),
      retryAfterSeconds: retryAfterOf(response),
    }
  }

  async result(model: string, requestId: string): Promise<Response | null> {
    const response = await this.send(
      "GET",
      requestPath(model, requestId),
      model,
      { timeoutMs: this.options.downloadTimeoutMs }
    )
    return response.status === 202 ? null : response
  }

  async cancel(model: string, requestId: string): Promise<void> {
    const response = await this.raw(
      "PUT",
      `${requestPath(model, requestId)}/cancel`
    )
    if (!response.ok && response.status !== 409) {
      throw routerErrorOf(await refusalOf(response, model))
    }
  }

  async download(url: string): Promise<Response> {
    const response = await this.options
      .fetch(url, {
        signal: AbortSignal.timeout(this.options.downloadTimeoutMs),
      })
      .catch((error: unknown) => {
        throw new EngineUnavailableError({ cause: error })
      })
    if (!response.ok) {
      throw new EngineUnavailableError({ cause: `download ${response.status}` })
    }
    return response
  }

  private async json(
    method: "GET" | "POST",
    path: string,
    model: string,
    init: SendInit = {}
  ): Promise<unknown> {
    const response = await this.send(method, path, model, init)
    return response.json()
  }

  private async send(
    method: "GET" | "POST" | "PUT",
    path: string,
    model: string,
    init: SendInit = {}
  ): Promise<Response> {
    const response = await this.raw(method, path, init)
    if (response.ok || response.status === 304) {
      return response
    }
    throw routerErrorOf(await refusalOf(response, model))
  }

  private async raw(
    method: "GET" | "POST" | "PUT",
    path: string,
    init: SendInit = {}
  ): Promise<Response> {
    const { apiKey } = this.options
    if (apiKey === null) {
      throw new EngineKeyInvalidError({ cause: "no key" })
    }
    const headers: Record<string, string> = {
      "X-API-Key": apiKey,
      ...(init.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    }
    try {
      return await this.options.fetch(`${RouterHttp.routerUrl}${path}`, {
        method,
        headers,
        ...(init.body === undefined ? {} : { body: init.body }),
        signal: AbortSignal.timeout(init.timeoutMs ?? this.options.timeoutMs),
      })
    } catch (error) {
      throw new EngineUnavailableError({ cause: error })
    }
  }

  private async publicText(url: string): Promise<string> {
    try {
      const response = await this.options.fetch(url, {
        signal: AbortSignal.timeout(this.options.timeoutMs),
      })
      if (!response.ok) {
        throw new EngineUnavailableError({ cause: `${url} ${response.status}` })
      }
      return await response.text()
    } catch (error) {
      throw error instanceof EngineUnavailableError
        ? error
        : new EngineUnavailableError({ cause: error })
    }
  }
}

export function creditsUsedOf(response: Response): number | null {
  const credits = Number(response.headers.get("x-comfy-credits-used"))
  return Number.isFinite(credits) && credits > 0 ? credits : null
}

type SendInit = {
  body?: string
  headers?: Record<string, string> | undefined
  timeoutMs?: number
}

async function tagOf(apiKey: string | null): Promise<string> {
  if (apiKey === null) {
    return RouterHttp.publicTag
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(apiKey)
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function modelPath(model: string): string {
  return `/v2/models/${model}`
}

function requestPath(model: string, requestId: string): string {
  return `${modelPath(model)}/requests/${encodeURIComponent(requestId)}`
}

function pageOf(body: unknown): CatalogPage {
  const models =
    arrayOf(fieldOf(body, "models")) ?? arrayOf(fieldOf(body, "data")) ?? []
  const ids = models.flatMap((entry) => {
    const id = stringOf(fieldOf(entry, "id"))
    return id === null ? [] : [id]
  })
  const next = stringOf(fieldOf(body, "next_cursor"))
  return { ids, next: fieldOf(body, "has_more") === false ? null : next }
}
