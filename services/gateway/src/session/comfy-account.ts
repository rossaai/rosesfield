import { CreditMeter, type Fetch } from "@rosesfield/generation"

export type AccountAnswer =
  | { state: "found"; id: string }
  | { state: "refused" }
  | { state: "unreachable" }

export type ProbeAnswer = {
  status: number
  errorType: string | null
  detail: string
}

type ComfyAccountOptions = {
  fetch?: Fetch
  timeoutMs?: number
}

const idPattern = /^[A-Za-z0-9_-]{1,128}$/

function fieldOf(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value
}

export class ComfyAccount {
  static readonly userUrl = "https://cloud.comfy.org/api/user"
  static readonly balanceUrl = "https://api.comfy.org/customers/balance"
  static readonly jobUrl =
    "https://cloud.comfy.org/api/v2/jobs/00000000-0000-4000-8000-000000000000"
  static readonly catalogUrl = "https://api.comfy.org/v2/models?limit=1"
  static readonly timeoutMs = 8000

  private readonly fetch: Fetch
  private readonly timeoutMs: number

  constructor(options: ComfyAccountOptions = {}) {
    this.fetch = options.fetch ?? ((input, init) => fetch(input, init))
    this.timeoutMs = options.timeoutMs ?? ComfyAccount.timeoutMs
  }

  async idOf(key: string): Promise<AccountAnswer> {
    const response = await this.get(ComfyAccount.userUrl, bearer(key))
    if (response === null) {
      return { state: "unreachable" }
    }
    if (response.status === 401 || response.status === 403) {
      return { state: "refused" }
    }
    if (!response.ok) {
      return { state: "unreachable" }
    }
    const id = fieldOf(await response.json().catch(() => null), "id")
    return typeof id === "string" && idPattern.test(id)
      ? { state: "found", id }
      : { state: "unreachable" }
  }

  async creditsOf(key: string): Promise<number | null> {
    const response = await this.get(ComfyAccount.balanceUrl, apiKey(key))
    if (response === null || !response.ok) {
      return null
    }
    const cents = fieldOf(
      await response.json().catch(() => null),
      "amount_cents"
    )
    return typeof cents === "number" && Number.isFinite(cents)
      ? Math.round(cents * CreditMeter.creditsPerCent * 100) / 100
      : null
  }

  async probeJobs(key: string): Promise<ProbeAnswer | null> {
    return this.probe(ComfyAccount.jobUrl, bearer(key))
  }

  async probeCatalog(key: string): Promise<ProbeAnswer | null> {
    return this.probe(ComfyAccount.catalogUrl, apiKey(key))
  }

  private async probe(
    url: string,
    headers: Record<string, string>
  ): Promise<ProbeAnswer | null> {
    const response = await this.get(url, headers)
    if (response === null) {
      return null
    }
    const text = await response.text().catch(() => "")
    const body = parseJson(text)
    const errorType =
      response.headers.get("x-comfy-error-type") ??
      textOf(fieldOf(body, "error_type"))
    return {
      status: response.status,
      errorType,
      detail: textOf(fieldOf(body, "detail")) ?? "",
    }
  }

  private async get(
    url: string,
    headers: Record<string, string>
  ): Promise<Response | null> {
    try {
      return await this.fetch(url, {
        headers: { Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch {
      return null
    }
  }
}

function bearer(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}` }
}

function apiKey(key: string): Record<string, string> {
  return { "X-API-Key": key }
}

function textOf(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
