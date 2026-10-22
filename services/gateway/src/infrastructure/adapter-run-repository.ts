import { type Run, type RunPage, RunRepository } from "@rosesfield/generation"
import type { RunId } from "@rosesfield/kernel"

type AdapterRunRepositoryOptions = {
  runs: RunRepository
  resumes: (adapter: string) => boolean
}

export class AdapterRunRepository extends RunRepository {
  private readonly runs: RunRepository
  private readonly resumes: (adapter: string) => boolean

  constructor(options: AdapterRunRepositoryOptions) {
    super()
    this.runs = options.runs
    this.resumes = options.resumes
  }

  override add(run: Run): Promise<Run> {
    return this.runs.add(run)
  }

  override save(run: Run): Promise<Run> {
    return this.runs.save(run)
  }

  override get(id: RunId): Promise<Run | null> {
    return this.runs.get(id)
  }

  override findByIdempotencyKey(key: string): Promise<Run | null> {
    return this.runs.findByIdempotencyKey(key)
  }

  override list(page: RunPage): Promise<Run[]> {
    return this.runs.list(page)
  }

  override async listUnfinished(): Promise<Run[]> {
    const unfinished = await this.runs.listUnfinished()
    return unfinished.filter((run) => this.resumes(run.adapter))
  }
}
