export type HostRun = {
  id: string
  appId: string
  status: string
  origin: string
  inputs: Record<string, unknown>
  outputs: string[]
  credits: number | null
  createdAt: string
}

export type HostAsset = { id: string; kind: string; mime: string }

export type HostAccount = { key: string; credits: number | null }

export type HostSettings = {
  mode: string
  lock: string
  keyFrom: string
  engineKey: string
}

type Row = Record<string, unknown>

export const creditsPerUsd = 211

const requestMs = 30_000
const downloadMs = 300_000
const keyHeader = "X-Engine-Key"

export function rowOf(value: unknown): Row {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function creditsOfCost(value: unknown): number | null {
  const amount = rowOf(value).amount
  return typeof amount === "number" && Number.isFinite(amount)
    ? Math.round(amount * creditsPerUsd * 100) / 100
    : null
}

export function runOf(value: unknown): HostRun {
  const row = rowOf(value)
  const outputs = Array.isArray(row.outputs) ? row.outputs : []
  return {
    id: textOf(row.id),
    appId: textOf(row.appId),
    status: textOf(row.status),
    origin: textOf(row.origin),
    inputs: rowOf(row.inputs),
    outputs: outputs.filter((one) => typeof one === "string"),
    credits: creditsOfCost(row.cost),
    createdAt: textOf(row.createdAt),
  }
}

export class DemoHost {
  readonly url: string
  readonly #key: string | null

  constructor(options: { url: string; key: string | null }) {
    this.url = options.url
    this.#key = options.key
  }

  async #answer(path: string, timeoutMs: number): Promise<Response> {
    let response: Response
    try {
      response = await fetch(new URL(path, this.url), {
        headers: {
          Accept: "application/json",
          ...(this.#key === null ? {} : { [keyHeader]: this.#key }),
        },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch {
      throw new Error(
        `${this.url} did not answer ${path}. Start the site first, or name another with --url or DEMO_URL.`
      )
    }
    if (!response.ok) {
      throw new Error(`${this.url}${path} answered ${response.status}.`)
    }
    return response
  }

  async #read(path: string): Promise<Row> {
    const response = await this.#answer(path, requestMs)
    return rowOf(await response.json())
  }

  async settings(): Promise<HostSettings> {
    const settings = rowOf((await this.#read("/api/settings")).settings)
    return {
      mode: textOf(settings.mode),
      lock: textOf(settings.lock),
      keyFrom: textOf(settings.keyFrom),
      engineKey: textOf(rowOf(settings.engine).key),
    }
  }

  async account(): Promise<HostAccount> {
    const account = rowOf((await this.#read("/api/account")).account)
    const credits = account.credits
    return {
      key: textOf(account.key),
      credits: typeof credits === "number" ? credits : null,
    }
  }

  async runs(appId: string): Promise<HostRun[]> {
    const body = await this.#read(
      `/api/runs?appId=${encodeURIComponent(appId)}`
    )
    const runs = Array.isArray(body.runs) ? body.runs : []
    return runs
      .map(runOf)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async run(runId: string): Promise<HostRun> {
    return runOf((await this.#read(`/api/runs/${runId}`)).run)
  }

  async asset(assetId: string): Promise<HostAsset> {
    const asset = rowOf((await this.#read(`/api/assets/${assetId}`)).asset)
    return {
      id: textOf(asset.id),
      kind: textOf(asset.kind),
      mime: textOf(asset.mime),
    }
  }

  async download(assetId: string, file: string): Promise<void> {
    const response = await this.#answer(
      `/api/assets/${assetId}/content`,
      downloadMs
    )
    await Bun.write(file, await response.arrayBuffer())
  }
}
