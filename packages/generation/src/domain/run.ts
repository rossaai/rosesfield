import {
  type Cost,
  errorEnvelopeOf,
  type RunOrigin,
  type Run as RunRecord,
  type RunRequest,
  type RunStatus,
} from "@rosesfield/contract"
import type { AppId, AssetId, ProjectError, RunId } from "@rosesfield/kernel"
import { RunFinishedError } from "#domain/error/run-finished.error"
import type { OutputsPerJob } from "#domain/generation-engine.port"

export type RunJobStatus =
  | "pending"
  | "submitting"
  | "queued"
  | "running"
  | "collecting"
  | "done"

export type RunJob = {
  index: number
  seed: number | null
  ref: string | null
  status: RunJobStatus
  progress: number | null
  outputs: AssetId[]
  collectingSince?: string
  submittingSince?: string
}

export type RunState = {
  record: RunRecord
  jobs: RunJob[]
  idempotencyKey: string | null
  attempts: number
  version: number
}

type QueueRunOptions = {
  id: RunId
  appId: AppId
  request: RunRequest
  seed: number | null
  adapter: string
  origin: RunOrigin
  idempotencyKey: string | null
  now: Date
  outputsPerJob?: OutputsPerJob
}

type SubmittedOptions = {
  index: number
  ref: string
  models: readonly string[]
  workflowHash: string | null
}

type ObserveOptions = {
  index: number
  state: "queued" | "running"
  progress: number | null
}

type KeepJobOptions = {
  index: number
  outputs: readonly AssetId[]
  cost?: Cost | null
  now: Date
}

type CollectingOptions = {
  index: number
  now: Date
}

type SubmittingOptions = {
  index: number
  now: Date
}

type FailOptions = {
  error: ProjectError
  now: Date
}

type CancelOptions = {
  now: Date
}

export class Run {
  static readonly maxSeed = 2_147_483_647
  static readonly finishedStatuses: readonly RunStatus[] = [
    "done",
    "failed",
    "cancelled",
  ]

  private state: RunState

  private constructor(state: RunState) {
    this.state = structuredClone(state)
  }

  static queue(options: QueueRunOptions): Run {
    const jobCount = options.outputsPerJob === "one" ? options.request.count : 1
    return new Run({
      record: {
        id: options.id,
        appId: options.appId,
        status: "queued",
        inputs: options.request.inputs,
        count: options.request.count,
        aspectRatio: options.request.aspectRatio,
        seed: options.seed,
        outputs: [],
        progress: null,
        engine: { adapter: options.adapter, models: [], workflowHash: null },
        cost: null,
        origin: options.origin,
        failure: null,
        createdAt: options.now.toISOString(),
        finishedAt: null,
      },
      jobs: Array.from({ length: jobCount }, (_, index) => ({
        index,
        seed: Run.seedAt(options.seed, index),
        ref: null,
        status: "pending",
        progress: null,
        outputs: [],
      })),
      idempotencyKey: options.idempotencyKey,
      attempts: 0,
      version: 0,
    })
  }

  static restore(state: RunState): Run {
    return new Run(state)
  }

  static seedAt(seed: number | null, index: number): number | null {
    return seed === null ? null : (seed + index) % (Run.maxSeed + 1)
  }

  get id(): RunId {
    return this.state.record.id
  }

  get appId(): AppId {
    return this.state.record.appId
  }

  get status(): RunStatus {
    return this.state.record.status
  }

  get adapter(): string {
    return this.state.record.engine.adapter
  }

  get jobs(): readonly RunJob[] {
    return structuredClone(this.state.jobs)
  }

  get attempts(): number {
    return this.state.attempts
  }

  get version(): number {
    return this.state.version
  }

  get idempotencyKey(): string | null {
    return this.state.idempotencyKey
  }

  get createdAt(): Date {
    return new Date(this.state.record.createdAt)
  }

  isFinished(): boolean {
    return Run.finishedStatuses.includes(this.state.record.status)
  }

  collectingSince(): Date | null {
    const since = this.state.jobs.flatMap((job) =>
      job.status === "collecting" && job.collectingSince !== undefined
        ? [Date.parse(job.collectingSince)]
        : []
    )
    return since.length === 0 ? null : new Date(Math.min(...since))
  }

  idempotencyKeyOf(index: number): string {
    return this.state.jobs.length === 1 ? this.id : `${this.id}-${index}`
  }

  liveRefs(): string[] {
    return this.state.jobs.flatMap((job) =>
      job.ref !== null && job.status !== "done" ? [job.ref] : []
    )
  }

  submittingSince(): Date | null {
    const since = this.state.jobs.flatMap((job) =>
      job.status === "submitting" && job.submittingSince !== undefined
        ? [Date.parse(job.submittingSince)]
        : []
    )
    return since.length === 0 ? null : new Date(Math.min(...since))
  }

  submitting(options: SubmittingOptions): void {
    this.refuseWhenFinished()
    const job = this.jobAt(options.index)
    job.status = "submitting"
    job.submittingSince = options.now.toISOString()
  }

  release(): void {
    this.refuseWhenFinished()
    for (const job of this.state.jobs) {
      if (job.status === "submitting") {
        job.status = "pending"
        delete job.submittingSince
      }
    }
  }

  submitted(options: SubmittedOptions): void {
    this.refuseWhenFinished()
    const job = this.jobAt(options.index)
    delete job.submittingSince
    job.ref = options.ref
    job.status = "queued"
    this.state.attempts = 0
    this.state.record.engine = {
      adapter: this.state.record.engine.adapter,
      models: [...options.models],
      workflowHash: options.workflowHash,
    }
  }

  observe(options: ObserveOptions): void {
    this.refuseWhenFinished()
    const job = this.jobAt(options.index)
    job.status = options.state
    job.progress = options.progress
    this.state.attempts = 0
    this.refresh()
  }

  collecting(options: CollectingOptions): void {
    this.refuseWhenFinished()
    const job = this.jobAt(options.index)
    job.status = "collecting"
    job.collectingSince ??= options.now.toISOString()
    this.refresh()
  }

  keepJob(options: KeepJobOptions): void {
    this.refuseWhenFinished()
    const job = this.jobAt(options.index)
    delete job.collectingSince
    job.status = "done"
    job.progress = 1
    job.outputs = [...options.outputs]
    this.state.attempts = 0
    this.addCost(options.cost ?? null)
    this.refresh()
    if (this.state.jobs.every((one) => one.status === "done")) {
      this.state.record.status = "done"
      this.state.record.progress = 1
      this.state.record.finishedAt = options.now.toISOString()
    }
  }

  retried(): void {
    this.refuseWhenFinished()
    this.state.attempts += 1
  }

  fail(options: FailOptions): void {
    this.refuseWhenFinished()
    this.state.record.status = "failed"
    this.state.record.failure = errorEnvelopeOf(options.error).error
    this.state.record.finishedAt = options.now.toISOString()
  }

  cancel(options: CancelOptions): void {
    this.refuseWhenFinished()
    this.state.record.status = "cancelled"
    this.state.record.finishedAt = options.now.toISOString()
  }

  withVersion(version: number): Run {
    return new Run({ ...this.state, version })
  }

  toRecord(): RunRecord {
    return structuredClone(this.state.record)
  }

  toState(): RunState {
    return structuredClone(this.state)
  }

  private addCost(cost: Cost | null): void {
    if (cost === null) {
      return
    }
    const held = this.state.record.cost?.amount ?? 0
    this.state.record.cost = { amount: held + cost.amount, currency: "USD" }
  }

  private jobAt(index: number): RunJob {
    const job = this.state.jobs.find((one) => one.index === index)
    if (job === undefined) {
      throw new RangeError(`The run ${this.id} has no job ${index}`)
    }
    return job
  }

  private refresh(): void {
    const { jobs, record } = this.state
    const hasStarted = jobs.some(
      (job) =>
        job.status === "running" ||
        job.status === "collecting" ||
        job.status === "done"
    )
    record.status = hasStarted ? "running" : "queued"
    record.outputs = jobs.flatMap((job) => job.outputs)
    const isMeasured = jobs.some((job) => job.progress !== null)
    record.progress = isMeasured
      ? jobs.reduce((sum, job) => sum + (job.progress ?? 0), 0) / jobs.length
      : null
  }

  private refuseWhenFinished(): void {
    if (this.isFinished()) {
      throw new RunFinishedError({ runId: this.id, status: this.status })
    }
  }
}
