import type { RunId } from "@rosesfield/kernel"
import type { AdvanceRunHandler } from "#application/advance-run/advance-run.handler"
import { JobRunner } from "#domain/job-runner.port"
import type { RunRepository } from "#domain/run.repository"

export type Timer = {
  after: (ms: number, callback: () => void) => () => void
}

type TimerJobRunnerOptions = {
  advance: AdvanceRunHandler
  runs: RunRepository
  timer?: Timer
}

export class TimerJobRunner extends JobRunner {
  static readonly errorDelayMs = 30_000
  static readonly systemTimer: Timer = {
    after: (ms, callback) => {
      const handle = setTimeout(callback, ms)
      return () => clearTimeout(handle)
    },
  }

  private readonly advance: AdvanceRunHandler
  private readonly runs: RunRepository
  private readonly timer: Timer
  private readonly watched = new Map<RunId, () => void>()

  constructor(options: TimerJobRunnerOptions) {
    super()
    this.advance = options.advance
    this.runs = options.runs
    this.timer = options.timer ?? TimerJobRunner.systemTimer
  }

  override async enqueue(runId: RunId): Promise<void> {
    if (!this.watched.has(runId)) {
      this.schedule(runId, 0)
    }
  }

  async resume(): Promise<number> {
    const unfinished = await this.runs.listUnfinished()
    await Promise.all(unfinished.map((run) => this.enqueue(run.id)))
    return unfinished.length
  }

  stop(): void {
    for (const cancel of this.watched.values()) {
      cancel()
    }
    this.watched.clear()
  }

  isWatching(runId: RunId): boolean {
    return this.watched.has(runId)
  }

  private schedule(runId: RunId, ms: number): void {
    const cancel = this.timer.after(ms, () => {
      void this.wake(runId)
    })
    this.watched.set(runId, cancel)
  }

  private async wake(runId: RunId): Promise<void> {
    let next: number | null
    try {
      next = (await this.advance.execute({ runId })).nextWakeMs
    } catch {
      next = TimerJobRunner.errorDelayMs
    }
    if (next === null || !this.watched.has(runId)) {
      this.watched.delete(runId)
      return
    }
    this.schedule(runId, next)
  }
}
