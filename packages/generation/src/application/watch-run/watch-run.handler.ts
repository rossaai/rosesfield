import type { Run as RunRecord } from "@rosesfield/contract"
import { type RunId, runIdFormat } from "@rosesfield/kernel"
import { RunNotFoundError } from "#domain/error/run-not-found.error"
import {
  type EngineStatus,
  type GenerationEngine,
  isWorkingStatus,
  type Pause,
} from "#domain/generation-engine.port"
import type { Run, RunJob } from "#domain/run"

export type RunFrame = { run: RunRecord }

export type WatchRunInput = {
  runId: string
  signal: AbortSignal
  pause: Pause
}

export type WatchedRun = { run: Run; engine: GenerationEngine | null }

type WatchRunHandlerOptions = {
  find: (runId: RunId) => Promise<WatchedRun | null>
  advance: (
    runId: RunId,
    known: ReadonlyMap<string, EngineStatus>
  ) => Promise<number | null>
  keep: (run: Run) => Promise<Run>
  isOverdue: (run: Run) => boolean
  mark: (runId: RunId) => void
  unmark: (runId: RunId) => void
  renewMs: number
}

type Followed = {
  run: Run
  ended: EngineStatus | null
  isUnsaved: boolean
}

type Live = RunJob & { ref: string }

function liveJobOf(run: Run): Live | null {
  for (const job of run.jobs) {
    const isLive = job.status === "queued" || job.status === "running"
    if (job.ref !== null && isLive) {
      return { ...job, ref: job.ref }
    }
  }
  return null
}

class SentFrames {
  private last = ""

  next(run: Run): RunFrame | null {
    const record = run.toRecord()
    const text = JSON.stringify(record)
    if (text === this.last) {
      return null
    }
    this.last = text
    return { run: record }
  }
}

export class WatchRunHandler {
  static readonly retryMs = 2000

  private readonly options: WatchRunHandlerOptions

  constructor(options: WatchRunHandlerOptions) {
    this.options = options
  }

  async *execute(input: WatchRunInput): AsyncGenerator<RunFrame, void, void> {
    const runId = runIdFormat.parse(input.runId)
    const found = await this.options.find(runId)
    if (found === null) {
      throw new RunNotFoundError({ runId: input.runId })
    }
    const sent = new SentFrames()
    const first = sent.next(found.run)
    if (first !== null) {
      yield first
    }
    if (found.engine === null || found.run.isFinished()) {
      return
    }
    const stop = new AbortController()
    const signal = AbortSignal.any([input.signal, stop.signal])
    this.options.mark(runId)
    const renewing = this.renew(runId, { ...input, signal })
    try {
      yield* this.follow(found, sent, { ...input, signal })
    } finally {
      stop.abort()
      await renewing
      this.options.unmark(runId)
    }
  }

  private async renew(runId: RunId, input: WatchRunInput): Promise<void> {
    while (!input.signal.aborted) {
      await input.pause(this.options.renewMs, input.signal)
      if (!input.signal.aborted) {
        this.options.mark(runId)
      }
    }
  }

  private async *follow(
    found: WatchedRun,
    sent: SentFrames,
    input: WatchRunInput
  ): AsyncGenerator<RunFrame, void, void> {
    const runId = found.run.id
    let { run } = found
    while (!input.signal.aborted && !run.isFinished()) {
      const job = liveJobOf(run)
      const engine = found.engine
      if (job === null || engine === null || this.options.isOverdue(run)) {
        const next = await this.advanceOnce(runId, new Map())
        const after = await this.reload(runId, sent)
        if (after === null) {
          return
        }
        yield* after.frames
        run = after.run
        if (liveJobOf(run) === null && !run.isFinished()) {
          await input.pause(next ?? WatchRunHandler.retryMs, input.signal)
        }
        continue
      }
      const followed = yield* this.followJob(run, job, engine, sent, input)
      const after = yield* this.settle(followed, job, sent, input)
      if (after === null) {
        return
      }
      run = after
    }
  }

  private async *settle(
    followed: Followed,
    job: Live,
    sent: SentFrames,
    input: WatchRunInput
  ): AsyncGenerator<RunFrame, Run | null, void> {
    const runId = followed.run.id
    if (followed.ended !== null) {
      await this.advanceOnce(runId, new Map([[job.ref, followed.ended]]))
    } else {
      if (followed.isUnsaved) {
        await this.options.keep(followed.run).catch(() => undefined)
      }
      if (input.signal.aborted) {
        return null
      }
      await this.advanceOnce(runId, new Map())
    }
    const after = await this.reload(runId, sent)
    if (after === null) {
      return null
    }
    yield* after.frames
    if (followed.ended === null && !after.run.isFinished()) {
      await input.pause(WatchRunHandler.retryMs, input.signal)
    }
    return after.run
  }

  private async *followJob(
    start: Run,
    job: Live,
    engine: GenerationEngine,
    sent: SentFrames,
    input: WatchRunInput
  ): AsyncGenerator<RunFrame, Followed, void> {
    let run = start
    let isUnsaved = false
    try {
      for await (const status of engine.watch(job.ref, input.signal)) {
        if (!isWorkingStatus(status)) {
          return { run, ended: status, isUnsaved }
        }
        const before = run.jobs.find((one) => one.index === job.index)?.status
        run.observe({ index: job.index, ...status })
        if (before === status.state) {
          isUnsaved = true
        } else {
          run = await this.options.keep(run)
          isUnsaved = false
        }
        const frame = sent.next(run)
        if (frame !== null) {
          yield frame
        }
        if (this.options.isOverdue(run)) {
          break
        }
      }
    } catch {
      return { run, ended: null, isUnsaved: false }
    }
    return { run, ended: null, isUnsaved }
  }

  private async advanceOnce(
    runId: RunId,
    known: ReadonlyMap<string, EngineStatus>
  ): Promise<number | null> {
    try {
      return await this.options.advance(runId, known)
    } catch {
      return WatchRunHandler.retryMs
    }
  }

  private async reload(
    runId: RunId,
    sent: SentFrames
  ): Promise<{ run: Run; frames: RunFrame[] } | null> {
    const found = await this.options.find(runId)
    if (found === null) {
      return null
    }
    const frame = sent.next(found.run)
    return { run: found.run, frames: frame === null ? [] : [frame] }
  }
}
