import type { Run as RunRecord } from "@rosesfield/contract"
import { type Clock, runIdFormat } from "@rosesfield/kernel"
import { RunNotFoundError } from "#domain/error/run-not-found.error"
import type { GenerationEngine } from "#domain/generation-engine.port"
import type { RunRepository } from "#domain/run.repository"

export type CancelRunInput = {
  runId: string
}

export type CancelRunOutput = {
  run: RunRecord
}

type CancelRunHandlerOptions = {
  runs: RunRepository
  engines: readonly GenerationEngine[]
  clock: Clock
}

export class CancelRunHandler {
  private readonly runs: RunRepository
  private readonly engines: readonly GenerationEngine[]
  private readonly clock: Clock

  constructor(options: CancelRunHandlerOptions) {
    this.runs = options.runs
    this.engines = options.engines
    this.clock = options.clock
  }

  async execute(input: CancelRunInput): Promise<CancelRunOutput> {
    const run = await this.runs.get(runIdFormat.parse(input.runId))
    if (run === null) {
      throw new RunNotFoundError({ runId: input.runId })
    }
    if (run.isFinished()) {
      return { run: run.toRecord() }
    }
    const engine = this.engines.find(
      (candidate) => candidate.key === run.adapter
    )
    if (engine !== undefined) {
      await Promise.all(run.liveRefs().map((ref) => engine.cancel(ref)))
    }
    run.cancel({ now: this.clock.now() })
    const stored = await this.runs.save(run)
    return { run: stored.toRecord() }
  }
}
