import type { RunId } from "@rosesfield/kernel"

export type WatchMarkPort = {
  mark: (runId: RunId) => Promise<void>
  clear: (runId: RunId) => Promise<void>
}

export class WatchMarks {
  static readonly markMs = 60_000
  static readonly renewMs = 30_000

  private readonly until = new Map<RunId, number>()

  mark(runId: RunId, now: Date): void {
    this.until.set(runId, now.getTime() + WatchMarks.markMs)
  }

  clear(runId: RunId): void {
    this.until.delete(runId)
  }

  heldMs(runId: RunId, now: Date): number | null {
    const until = this.until.get(runId)
    if (until === undefined) {
      return null
    }
    const left = until - now.getTime()
    if (left <= 0) {
      this.until.delete(runId)
      return null
    }
    return left
  }
}
