import type { FirstLightTarget } from "./first-light-target"

export type Fetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type RunMetrics = {
  queueSeconds: number | null
  gpuSeconds: number | null
  cost: Record<string, number> | null
  source: string
}

export const runpodApiUrl = "https://api.runpod.ai/v2"

const metricsTimeoutMs = 30_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function numberAt(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function seconds(milliseconds: number | null): number | null {
  return milliseconds === null ? null : milliseconds / 1000
}

function costOf(
  metrics: Record<string, unknown>
): Record<string, number> | null {
  const cost = Object.fromEntries(
    Object.entries(metrics).flatMap(([key, value]) =>
      /cost|credit|price|usd/i.test(key) && typeof value === "number"
        ? [[key, value]]
        : []
    )
  )
  return Object.keys(cost).length === 0 ? null : cost
}

function urlOf(target: FirstLightTarget, ref: string): string {
  return target.kind === "comfy"
    ? `${target.baseUrl}/api/v2/jobs/${encodeURIComponent(ref)}`
    : `${runpodApiUrl}/${target.endpointId}/status/${encodeURIComponent(ref)}`
}

export async function readMetrics(
  target: FirstLightTarget,
  ref: string,
  fetcher: Fetch
): Promise<RunMetrics> {
  const url = urlOf(target, ref)
  const response = await fetcher(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${target.apiKey}` },
    signal: AbortSignal.timeout(metricsTimeoutMs),
  })
  const body: unknown = response.ok ? await response.json() : null
  const record = isRecord(body) ? body : {}
  if (target.kind === "runpod") {
    return {
      queueSeconds: seconds(numberAt(record, "delayTime")),
      gpuSeconds: seconds(numberAt(record, "executionTime")),
      cost: null,
      source: "the status record's delayTime and executionTime",
    }
  }
  const metrics = isRecord(record.metrics) ? record.metrics : {}
  return {
    queueSeconds: seconds(numberAt(metrics, "queue_ms")),
    gpuSeconds: seconds(numberAt(metrics, "execution_ms")),
    cost: costOf(metrics),
    source: "the job record's metrics.queue_ms and metrics.execution_ms",
  }
}
