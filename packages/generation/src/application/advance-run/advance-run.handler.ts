import { type Clock, ProjectError, type RunId } from "@rosesfield/kernel"
import {
  endRun,
  isRetryable,
  noOutput,
  timeOutRun,
} from "#application/advance-run/end-run"
import {
  keepSteps,
  type Polled,
  reopenLost,
} from "#application/advance-run/engine-steps"
import { jobInputsOf } from "#application/advance-run/job-inputs"
import {
  collectJob,
  type KeepPorts,
  keepFinished,
  type Watch,
} from "#application/advance-run/keep-job"
import { isCostLate, LatePrices } from "#application/advance-run/late-price"
import { runRequestOf } from "#application/advance-run/run-request"
import {
  backoffMs,
  isClaimHeld,
  isPastLimit,
  isPastResultKept,
  isSubmitDue,
  pollMs,
  wakeMs,
} from "#application/advance-run/run-timing"
import { runWatchOf } from "#application/advance-run/run-watch"
import {
  type WatchMarkPort,
  WatchMarks,
} from "#application/advance-run/watch-marks"
import type {
  RunFrame,
  WatchRunInput,
} from "#application/watch-run/watch-run.handler"
import type { AppCatalog } from "#domain/app-catalog.port"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunConflictError } from "#domain/error/run-conflict.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import type {
  EngineRequest,
  EngineStatus,
  GenerationEngine,
} from "#domain/generation-engine.port"
import type { PriceBook } from "#domain/price-book.port"
import type { Run, RunJob } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"
import type { RunAssets } from "#domain/run-assets.port"

export type AdvanceRunInput = {
  runId: RunId
  known?: ReadonlyMap<string, EngineStatus>
  source?: "watcher" | "stream"
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
  prices?: PriceBook
  watchMarks?: WatchMarkPort
  log?: (line: string) => void
}

const unknown: ReadonlyMap<string, EngineStatus> = new Map()

const stop: AdvanceRunOutput = { nextWakeMs: null }

export class AdvanceRunHandler {
  static readonly watchMarkMs = WatchMarks.markMs

  private readonly apps: AppCatalog
  private readonly runs: RunRepository
  private readonly engines: readonly GenerationEngine[]
  private readonly assets: RunAssets
  private readonly clock: Clock
  private readonly prices: PriceBook | null
  private readonly marks = new WatchMarks()
  private readonly watchMarks: WatchMarkPort | null
  private readonly log: (line: string) => void
  private readonly late: LatePrices

  constructor(options: AdvanceRunHandlerOptions) {
    this.apps = options.apps
    this.runs = options.runs
    this.engines = options.engines
    this.assets = options.assets
    this.clock = options.clock
    this.prices = options.prices ?? null
    this.watchMarks = options.watchMarks ?? null
    this.log = options.log ?? console.error
    this.late = new LatePrices({
      runs: this.runs,
      prices: this.prices,
      clock: this.clock,
    })
  }

  watch(input: WatchRunInput): AsyncGenerator<RunFrame, void, void> {
    const frames = runWatchOf({
      apps: this.apps,
      runs: this.runs,
      engines: this.engines,
      clock: this.clock,
      marks: this.marks,
      shared: this.watchMarks,
      advance: async (runId, known) =>
        (await this.execute({ runId, known, source: "stream" })).nextWakeMs,
    }).execute(input)
    return this.late.after(frames, input)
  }

  async execute(input: AdvanceRunInput): Promise<AdvanceRunOutput> {
    const output = await this.step(input)
    if (output.nextWakeMs === null) {
      this.late.settle(input.runId)
    }
    return output
  }

  private async step(input: AdvanceRunInput): Promise<AdvanceRunOutput> {
    if (input.source !== "stream") {
      const heldMs = this.marks.heldMs(input.runId, this.now())
      if (heldMs !== null) {
        return { nextWakeMs: heldMs }
      }
    }
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
    if (isPastLimit(run, app, this.now()) && run.collectingSince() === null) {
      return this.timeOut(run, watch)
    }
    if (run.jobs.length === 0) {
      return this.failWith(run, new RunFailedError({ cause: "no job" }))
    }
    if (run.jobs.some((job) => job.status === "submitting")) {
      if (engine.idempotency === "none") {
        return this.failWith(run, new RunFailedError({ cause: "lost submit" }))
      }
      if (isClaimHeld(run, engine, this.now())) {
        return { nextWakeMs: pollMs }
      }
      run.release()
    }
    if (reopenLost(run, engine) === "unkept") {
      return this.failWith(run, new RunFailedError({ cause: "lost run" }))
    }
    try {
      return isSubmitDue(run, engine)
        ? await this.submitPending(run, watch)
        : await this.poll(run, watch, input.known ?? unknown)
    } catch (error) {
      return this.recover(run.id, watch, error)
    }
  }

  private async submitPending(
    run: Run,
    watch: Watch
  ): Promise<AdvanceRunOutput> {
    const base = await runRequestOf(run, watch.app, this.assets)
    const form = await watch.engine.formOf(base.binding)
    const pending = run.jobs.filter((one) => one.status === "pending")
    const sending = watch.engine.submitsAlone() ? pending.slice(0, 1) : pending
    let current = run
    for (const job of sending) {
      current = await this.submitJob(current, watch, job.index, {
        ...base,
        inputs: jobInputsOf(base, job, current.jobs.length, form),
        idempotencyKey: current.idempotencyKeyOf(job.index),
        seed: job.seed,
        count: current.jobs.length === 1 ? base.count : 1,
        ...(job.steps === undefined ? {} : { steps: job.steps }),
      })
      if (current.isFinished()) {
        return stop
      }
    }
    return { nextWakeMs: pollMs }
  }

  private async submitJob(
    run: Run,
    watch: Watch,
    index: number,
    request: EngineRequest
  ): Promise<Run> {
    const { engine } = watch
    run.submitting({ index, now: this.now() })
    const current = await this.runs.save(run)
    const submission = await engine.submit(request)
    current.submitted({
      index,
      ref: submission.ref,
      models: submission.models,
      workflowHash: submission.workflowHash,
    })
    if (submission.finished !== undefined) {
      await keepFinished(this.keepPorts(), current, watch, {
        index,
        finished: submission.finished,
      })
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

  private async poll(
    run: Run,
    watch: Watch,
    known: ReadonlyMap<string, EngineStatus>
  ): Promise<AdvanceRunOutput> {
    const polled = await Promise.all(
      run.jobs.flatMap((job) =>
        job.ref === null || job.status === "done"
          ? []
          : [this.read(watch.engine, job, job.ref, known)]
      )
    )
    keepSteps(run, polled)
    let isCollecting = false
    for (const one of polled) {
      if (one.status.state === "succeeded") {
        const collected = await collectJob(this.keepPorts(), run, one, watch)
        if (collected === "empty") {
          return this.end(run, watch.engine, polled, noOutput())
        }
        if (collected === "kept" && isCostLate(one.status)) {
          this.late.owe(run.id, {
            ...watch,
            index: one.job.index,
            ref: one.ref,
          })
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
    if (isCollecting && isPastResultKept(run, this.now())) {
      return this.failWith(run, new RunFailedError({ cause: "result gone" }))
    }
    await this.runs.save(run)
    if (run.isFinished()) {
      return stop
    }
    return run.jobs.some((job) => job.status === "pending")
      ? { nextWakeMs: pollMs }
      : { nextWakeMs: wakeMs(polled.map((one) => one.status)) }
  }

  private async read(
    engine: GenerationEngine,
    job: RunJob,
    ref: string,
    known: ReadonlyMap<string, EngineStatus>
  ): Promise<Polled> {
    return { job, ref, status: known.get(ref) ?? (await engine.read(ref)) }
  }

  private async end(
    run: Run,
    engine: GenerationEngine,
    polled: readonly Polled[],
    ending: ProjectError | "cancelled"
  ): Promise<AdvanceRunOutput> {
    const ports = { runs: this.runs, engine, now: this.now() }
    await endRun(ports, run, polled, ending)
    return stop
  }

  private async timeOut(run: Run, watch: Watch): Promise<AdvanceRunOutput> {
    const ports = { runs: this.runs, engine: watch.engine, now: this.now() }
    await timeOutRun(ports, run, watch.app)
    return stop
  }

  private async recover(
    runId: RunId,
    watch: Watch,
    error: unknown
  ): Promise<AdvanceRunOutput> {
    if (error instanceof RunConflictError) {
      return { nextWakeMs: pollMs }
    }
    const run = await this.runs.get(runId)
    if (run === null || run.isFinished()) {
      return stop
    }
    const failure =
      error instanceof ProjectError
        ? error
        : new RunFailedError({ cause: error })
    if (watch.engine.idempotency === "keyed") {
      run.release()
    }
    const isSending = run.jobs.some((job) => job.status === "submitting")
    if (
      !isSending &&
      isRetryable(error) &&
      run.attempts < watch.app.limits.maxRetries
    ) {
      run.retried()
      await this.runs.save(run)
      return { nextWakeMs: backoffMs(run.attempts, failure) }
    }
    const raw = error instanceof Error ? error : new Error(String(error))
    this.log(`Run ${run.id} failed: ${raw.name}: ${raw.message}`)
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

  private keepPorts(): KeepPorts {
    return { assets: this.assets, prices: this.prices, now: this.now() }
  }

  private now(): Date {
    return this.clock.now()
  }
}
