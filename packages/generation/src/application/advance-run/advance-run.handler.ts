import type { AppDefinition } from "@rosesfield/contract"
import {
  type Clock,
  ProjectError,
  RateLimitedError,
  type RunId,
} from "@rosesfield/kernel"
import { keepOutputs } from "#application/advance-run/keep-outputs"
import { runRequestOf } from "#application/advance-run/run-request"
import type { AppCatalog } from "#domain/app-catalog.port"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunConflictError } from "#domain/error/run-conflict.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import { RunTimedOutError } from "#domain/error/run-timed-out.error"
import type {
  EngineFinished,
  EngineOutput,
  EngineRequest,
  EngineStatus,
  GenerationEngine,
} from "#domain/generation-engine.port"
import type { Run, RunJob } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"
import type { RunAssets } from "#domain/run-assets.port"

export type AdvanceRunInput = {
  runId: RunId
}

export type AdvanceRunOutput = {
  nextWakeMs: number | null
}

type AdvanceRunHandlerOptions = {
  apps: AppCatalog
  runs: RunRepository
  engines: readonly GenerationEngine[]
  assets: RunAssets
  clock: Clock
}

type Polled = {
  job: RunJob
  ref: string
  status: EngineStatus
}

type Watch = {
  app: AppDefinition
  engine: GenerationEngine
}

type Collected = "kept" | "empty" | "retry"

const stop: AdvanceRunOutput = { nextWakeMs: null }

function isRetryable(error: unknown): boolean {
  return (
    error instanceof RateLimitedError || error instanceof EngineUnavailableError
  )
}

function noOutput(): RunFailedError {
  return new RunFailedError({ cause: "no output of the app's kind" })
}

export class AdvanceRunHandler {
  static readonly pollMs = 2000
  static readonly maxBackoffMs = 60_000
  static readonly collectRetryMs = 30_000
  static readonly resultKeptMs = 86_400_000

  private readonly apps: AppCatalog
  private readonly runs: RunRepository
  private readonly engines: readonly GenerationEngine[]
  private readonly assets: RunAssets
  private readonly clock: Clock

  constructor(options: AdvanceRunHandlerOptions) {
    this.apps = options.apps
    this.runs = options.runs
    this.engines = options.engines
    this.assets = options.assets
    this.clock = options.clock
  }

  async execute(input: AdvanceRunInput): Promise<AdvanceRunOutput> {
    const run = await this.runs.get(input.runId)
    if (run === null || run.isFinished()) {
      return stop
    }
    const app = this.apps.find(run.appId)
    const engine = this.engines.find(
      (candidate) => candidate.key === run.adapter
    )
    if (app === null || engine === undefined) {
      return this.failWith(run, new EngineUnavailableError({}))
    }
    const watch: Watch = { app, engine }
    if (this.isPastLimit(run, app) && run.collectingSince() === null) {
      return this.timeOut(run, watch)
    }
    if (run.jobs.length === 0) {
      return this.failWith(run, new RunFailedError({ cause: "no job" }))
    }
    if (run.jobs.some((job) => job.status === "submitting")) {
      return this.failWith(run, new RunFailedError({ cause: "lost submit" }))
    }
    try {
      return run.jobs.some((job) => job.status === "pending")
        ? await this.submitPending(run, watch)
        : await this.poll(run, watch)
    } catch (error) {
      return this.recover(run.id, watch, error)
    }
  }

  private async submitPending(
    run: Run,
    watch: Watch
  ): Promise<AdvanceRunOutput> {
    const base = await runRequestOf(run, watch.app, this.assets)
    let current = run
    for (const job of run.jobs.filter((one) => one.status === "pending")) {
      current = await this.submitJob(current, watch, job.index, {
        ...base,
        idempotencyKey: current.idempotencyKeyOf(job.index),
        seed: job.seed,
        count: current.jobs.length === 1 ? base.count : 1,
      })
      if (current.isFinished()) {
        return stop
      }
    }
    return { nextWakeMs: AdvanceRunHandler.pollMs }
  }

  private async submitJob(
    run: Run,
    watch: Watch,
    index: number,
    request: EngineRequest
  ): Promise<Run> {
    const { engine } = watch
    let current = run
    if (engine.idempotency === "none") {
      current.submitting(index)
      current = await this.runs.save(current)
    }
    const submission = await engine.submit(request)
    current.submitted({
      index,
      ref: submission.ref,
      models: submission.models,
      workflowHash: submission.workflowHash,
    })
    if (submission.finished !== undefined) {
      await this.keepFinished(current, watch, index, submission.finished)
    }
    try {
      return await this.runs.save(current)
    } catch (error) {
      if (error instanceof RunConflictError && engine.idempotency === "none") {
        await engine.cancel(submission.ref)
      }
      throw error
    }
  }

  private async keepFinished(
    run: Run,
    watch: Watch,
    index: number,
    finished: EngineFinished
  ): Promise<void> {
    const kept = await keepOutputs(
      run,
      watch.app,
      finished.outputs,
      this.assets
    )
    if (kept === null) {
      run.fail({ error: noOutput(), now: this.now() })
      return
    }
    run.keepJob({ index, outputs: kept, cost: finished.cost, now: this.now() })
  }

  private async poll(run: Run, watch: Watch): Promise<AdvanceRunOutput> {
    const polled = await Promise.all(
      run.jobs.flatMap((job) =>
        job.ref === null || job.status === "done"
          ? []
          : [this.read(watch.engine, job, job.ref)]
      )
    )
    let isCollecting = false
    for (const one of polled) {
      if (one.status.state === "succeeded") {
        const collected = await this.collect(run, one, watch)
        if (collected === "empty") {
          return this.end(run, watch.engine, polled, noOutput())
        }
        isCollecting ||= collected === "retry"
      }
    }
    for (const { status } of polled) {
      if (status.state === "failed" || status.state === "cancelled") {
        const ending = status.state === "failed" ? status.error : "cancelled"
        return this.end(run, watch.engine, polled, ending)
      }
    }
    for (const { job, status } of polled) {
      if (status.state === "queued" || status.state === "running") {
        run.observe({ index: job.index, ...status })
      }
    }
    if (isCollecting && this.isPastResultKept(run)) {
      return this.failWith(run, new RunFailedError({ cause: "result gone" }))
    }
    await this.runs.save(run)
    return run.isFinished() ? stop : { nextWakeMs: this.wakeMs(polled) }
  }

  private async collect(
    run: Run,
    polled: Polled,
    watch: Watch
  ): Promise<Collected> {
    let outputs: EngineOutput[]
    try {
      outputs = await watch.engine.listOutputs(
        polled.ref,
        run.toRecord().inputs
      )
    } catch (error) {
      if (!isRetryable(error)) {
        throw error
      }
      run.collecting({ index: polled.job.index, now: this.now() })
      return "retry"
    }
    const kept = await keepOutputs(run, watch.app, outputs, this.assets)
    if (kept === null) {
      return "empty"
    }
    run.keepJob({
      index: polled.job.index,
      outputs: kept,
      cost:
        polled.status.state === "succeeded"
          ? (polled.status.cost ?? null)
          : null,
      now: this.now(),
    })
    return "kept"
  }

  private async read(
    engine: GenerationEngine,
    job: RunJob,
    ref: string
  ): Promise<Polled> {
    return { job, ref, status: await engine.read(ref) }
  }

  private async end(
    run: Run,
    engine: GenerationEngine,
    polled: readonly Polled[],
    ending: ProjectError | "cancelled"
  ): Promise<AdvanceRunOutput> {
    const working = polled.flatMap((one) =>
      one.status.state === "queued" || one.status.state === "running"
        ? [one.ref]
        : []
    )
    const refused = await this.cancelAll(engine, working)
    if (ending === "cancelled") {
      run.cancel({ now: this.now() })
    } else {
      run.fail({ error: ending, now: this.now() })
    }
    await this.runs.save(run)
    if (refused !== null) {
      throw refused
    }
    return stop
  }

  private async timeOut(run: Run, watch: Watch): Promise<AdvanceRunOutput> {
    const refused = await this.cancelAll(watch.engine, run.liveRefs())
    run.fail({
      error: new RunTimedOutError({
        runId: run.id,
        limitSeconds: watch.app.limits.timeoutSeconds,
      }),
      now: this.now(),
    })
    await this.runs.save(run)
    if (refused !== null) {
      throw refused
    }
    return stop
  }

  private async cancelAll(
    engine: GenerationEngine,
    refs: readonly string[]
  ): Promise<unknown> {
    const results = await Promise.allSettled(
      refs.map((ref) => engine.cancel(ref))
    )
    const refused = results.find((result) => result.status === "rejected")
    return refused === undefined ? null : refused.reason
  }

  private async recover(
    runId: RunId,
    watch: Watch,
    error: unknown
  ): Promise<AdvanceRunOutput> {
    if (error instanceof RunConflictError) {
      return { nextWakeMs: AdvanceRunHandler.pollMs }
    }
    const run = await this.runs.get(runId)
    if (run === null || run.isFinished()) {
      return stop
    }
    const failure =
      error instanceof ProjectError
        ? error
        : new RunFailedError({ cause: error })
    const isSending = run.jobs.some((job) => job.status === "submitting")
    if (
      !isSending &&
      isRetryable(error) &&
      run.attempts < watch.app.limits.maxRetries
    ) {
      run.retried()
      await this.runs.save(run)
      return { nextWakeMs: this.backoffMs(run.attempts, failure) }
    }
    return this.failWith(run, failure)
  }

  private async failWith(
    run: Run,
    error: ProjectError
  ): Promise<AdvanceRunOutput> {
    run.fail({ error, now: this.now() })
    await this.runs.save(run)
    return stop
  }

  private backoffMs(attempts: number, error: ProjectError): number {
    if (error instanceof RateLimitedError && error.retryAfterSeconds !== null) {
      return error.retryAfterSeconds * 1000
    }
    return Math.min(AdvanceRunHandler.maxBackoffMs, 1000 * 2 ** attempts)
  }

  private wakeMs(polled: readonly Polled[]): number {
    const working = polled.filter(
      (one) => one.status.state === "queued" || one.status.state === "running"
    )
    if (working.length === 0) {
      return AdvanceRunHandler.collectRetryMs
    }
    const waits = working.flatMap((one) =>
      (one.status.state === "queued" || one.status.state === "running") &&
      one.status.retryAfterSeconds !== null
        ? [one.status.retryAfterSeconds * 1000]
        : []
    )
    return waits.length === 0 ? AdvanceRunHandler.pollMs : Math.min(...waits)
  }

  private isPastResultKept(run: Run): boolean {
    const since = run.collectingSince()
    return (
      since !== null &&
      this.now().getTime() - since.getTime() > AdvanceRunHandler.resultKeptMs
    )
  }

  private isPastLimit(run: Run, app: AppDefinition): boolean {
    const elapsed = this.now().getTime() - run.createdAt.getTime()
    return elapsed > app.limits.timeoutSeconds * 1000
  }

  private now(): Date {
    return this.clock.now()
  }
}
