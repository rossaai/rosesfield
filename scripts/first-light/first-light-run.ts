import type { Workflow } from "../../packages/catalog/src/workflow-registry"
import type {
  EngineOutput,
  EngineRequest,
  GenerationEngine,
} from "../../packages/generation/src/index"
import { type Fetch, type RunMetrics, readMetrics } from "./first-light-metrics"
import { planRequest, type Samples } from "./first-light-request"
import type { FirstLightTarget } from "./first-light-target"

export type RunStatus =
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed-out"
  | "skipped"

export type OutputRecord = {
  file: string
  kind: string
  mime: string
  bytes: number
}

export type Report = {
  workflow: string
  engine: string
  status: RunStatus
  reason: string | null
  startedAt: string | null
  finishedAt: string | null
  seconds: number | null
  queueSeconds: number | null
  gpuSeconds: number | null
  cost: Record<string, number> | null
  metricsSource: string | null
  idempotencyKey: string | null
  ref: string | null
  workflowHash: string | null
  outputs: OutputRecord[]
}

export type RunResult = { report: Report; outputs: EngineOutput[] }

export type RunOptions = {
  engine: GenerationEngine
  target: FirstLightTarget
  workflow: Workflow
  samples: Samples
  sampleText: string
  values: Readonly<Record<string, string | number>>
  now: () => number
  sleep: (milliseconds: number) => Promise<void>
  fetch: Fetch
  pollSeconds: number
  timeoutSeconds: number
  newId: () => string
}

const extensions: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/flac": "flac",
  "audio/ogg": "ogg",
}

function emptyReport(options: RunOptions): Report {
  return {
    workflow: options.workflow.id,
    engine: options.target.label,
    status: "skipped",
    reason: null,
    startedAt: null,
    finishedAt: null,
    seconds: null,
    queueSeconds: null,
    gpuSeconds: null,
    cost: null,
    metricsSource: null,
    idempotencyKey: null,
    ref: null,
    workflowHash: null,
    outputs: [],
  }
}

export function reasonOf(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error ? String(error.code) : error.name
    return `${code}: ${error.message}`
  }
  return String(error)
}

export function fileNameOf(
  workflow: string,
  index: number,
  mime: string
): string {
  return `${workflow}-${index + 1}.${extensions[mime] ?? "bin"}`
}

type Waited = { status: RunStatus; reason: string | null }

async function waitFor(
  options: RunOptions,
  ref: string,
  started: number
): Promise<Waited> {
  for (;;) {
    const status = await options.engine.read(ref)
    if (status.state === "succeeded") {
      return { status: "succeeded", reason: null }
    }
    if (status.state === "failed") {
      return { status: "failed", reason: reasonOf(status.error) }
    }
    if (status.state === "cancelled") {
      return { status: "cancelled", reason: "The engine cancelled the run." }
    }
    if (options.now() - started >= options.timeoutSeconds * 1000) {
      await options.engine.cancel(ref)
      return {
        status: "timed-out",
        reason: `The run passed ${options.timeoutSeconds} seconds and first-light cancelled it.`,
      }
    }
    const wait = Math.max(options.pollSeconds, status.retryAfterSeconds ?? 0)
    await options.sleep(wait * 1000)
  }
}

async function metricsOf(
  options: RunOptions,
  ref: string
): Promise<RunMetrics> {
  try {
    return await readMetrics(options.target, ref, options.fetch)
  } catch (error) {
    return {
      queueSeconds: null,
      gpuSeconds: null,
      cost: null,
      source: `unread, ${reasonOf(error)}`,
    }
  }
}

async function submitted(
  options: RunOptions,
  request: EngineRequest,
  report: Report
): Promise<RunResult> {
  const started = options.now()
  report.startedAt = new Date(started).toISOString()
  const submission = await options.engine.submit(request)
  report.ref = submission.ref
  report.workflowHash = submission.workflowHash
  const waited = await waitFor(options, submission.ref, started)
  const outputs =
    waited.status === "succeeded"
      ? await options.engine.listOutputs(submission.ref)
      : []
  const finished = options.now()
  const metrics = await metricsOf(options, submission.ref)
  report.status = waited.status
  report.reason = waited.reason
  report.finishedAt = new Date(finished).toISOString()
  report.seconds = (finished - started) / 1000
  report.queueSeconds = metrics.queueSeconds
  report.gpuSeconds = metrics.gpuSeconds
  report.cost = metrics.cost
  report.metricsSource = metrics.source
  report.outputs = outputs.map((output, index) => ({
    file: fileNameOf(options.workflow.id, index, output.mime),
    kind: output.kind,
    mime: output.mime,
    bytes: output.bytes.length,
  }))
  return { report, outputs }
}

export async function runWorkflow(options: RunOptions): Promise<RunResult> {
  const report = emptyReport(options)
  const idempotencyKey = options.newId()
  const plan = planRequest({
    workflow: options.workflow,
    samples: options.samples,
    sampleText: options.sampleText,
    values: options.values,
    idempotencyKey,
    timeoutSeconds: options.timeoutSeconds,
    newId: options.newId,
  })
  if (!plan.ok) {
    report.reason = `It needs a sample ${plan.missing.join(" and ")} file. Add ${plan.missing.map((kind) => `${kind}.*`).join(" and ")} to the inputs folder.`
    return { report, outputs: [] }
  }
  report.idempotencyKey = idempotencyKey
  try {
    return await submitted(options, plan.request, report)
  } catch (error) {
    report.status = "failed"
    report.reason = reasonOf(error)
    if (report.ref !== null) {
      report.reason += await cancelled(options, report.ref)
    }
    return { report, outputs: [] }
  }
}

async function cancelled(options: RunOptions, ref: string): Promise<string> {
  try {
    await options.engine.cancel(ref)
    return " first-light asked the engine to cancel the run."
  } catch (error) {
    return ` The cancel failed too: ${reasonOf(error)}`
  }
}
