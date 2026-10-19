import { type Run, type RunPage, RunRepository } from "@rosesfield/generation"
import type { RunId } from "@rosesfield/kernel"

export class FakeRunRepository extends RunRepository {
  private readonly stored = new Map<RunId, Run>()

  get count(): number {
    return this.stored.size
  }

  override async add(run: Run): Promise<Run> {
    const next = run.withVersion(1)
    this.stored.set(run.id, next)
    return next
  }

  override async save(run: Run): Promise<Run> {
    const next = run.withVersion(run.version + 1)
    this.stored.set(run.id, next)
    return next
  }

  override async get(id: RunId): Promise<Run | null> {
    return this.stored.get(id) ?? null
  }

  override async findByIdempotencyKey(key: string): Promise<Run | null> {
    const runs = [...this.stored.values()]
    return runs.find((run) => run.idempotencyKey === key) ?? null
  }

  override async list(page: RunPage): Promise<Run[]> {
    return [...this.stored.values()].slice(0, page.limit)
  }

  override async listUnfinished(): Promise<Run[]> {
    return [...this.stored.values()].filter((run) => !run.isFinished())
  }
}
