import type { RunId } from "@rosesfield/kernel"
import { RunConflictError } from "#domain/error/run-conflict.error"
import { Run } from "#domain/run"
import { type RunPage, RunRepository } from "#domain/run.repository"

export class FakeRunRepository extends RunRepository {
  private readonly stored = new Map<RunId, Run>()

  override async add(run: Run): Promise<Run> {
    const taken = [...this.stored.values()].some(
      (other) =>
        run.idempotencyKey !== null &&
        other.idempotencyKey === run.idempotencyKey
    )
    if (this.stored.has(run.id) || taken) {
      throw new RunConflictError({ runId: run.id })
    }
    const next = run.withVersion(1)
    this.stored.set(run.id, next)
    return next
  }

  override async save(run: Run): Promise<Run> {
    const current = this.stored.get(run.id)
    if (current === undefined || current.version !== run.version) {
      throw new RunConflictError({ runId: run.id })
    }
    const next = run.withVersion(run.version + 1)
    this.stored.set(run.id, next)
    return next
  }

  override async get(id: RunId): Promise<Run | null> {
    const run = this.stored.get(id)
    return run === undefined ? null : Run.restore(run.toState())
  }

  override async findByIdempotencyKey(key: string): Promise<Run | null> {
    const run = [...this.stored.values()].find(
      (candidate) => candidate.idempotencyKey === key
    )
    return run === undefined ? null : Run.restore(run.toState())
  }

  override async list(page: RunPage): Promise<Run[]> {
    const { appId, before } = page
    return [...this.stored.values()]
      .filter((run) => run.toRecord().place !== "held")
      .filter((run) => appId === null || run.appId === appId)
      .filter(
        (run) =>
          before === null ||
          run.createdAt < before.createdAt ||
          (run.createdAt.getTime() === before.createdAt.getTime() &&
            run.id < before.id)
      )
      .sort(newestFirst)
      .slice(0, page.limit)
  }

  override async listUnfinished(): Promise<Run[]> {
    return [...this.stored.values()]
      .filter((run) => !run.isFinished())
      .sort((left, right) => newestFirst(right, left))
  }
}

function newestFirst(left: Run, right: Run): number {
  const byTime = right.createdAt.getTime() - left.createdAt.getTime()
  if (byTime !== 0) {
    return byTime
  }
  return left.id < right.id ? 1 : left.id > right.id ? -1 : 0
}
