import type { Cost } from "@rosesfield/contract"
import { type Clock, type RunId, runIdFormat } from "@rosesfield/kernel"
import type { Watch } from "#application/advance-run/keep-job"
import { recordPrice } from "#application/advance-run/record-price"
import type {
  RunFrame,
  WatchRunInput,
} from "#application/watch-run/watch-run.handler"
import { RunConflictError } from "#domain/error/run-conflict.error"
import type {
  EngineStatus,
  GenerationEngine,
} from "#domain/generation-engine.port"
import type { PriceBook } from "#domain/price-book.port"
import { Run } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"

export type LateJob = Watch & { index: number; ref: string }

type JobCost = { index: number; cost: Cost }

type LatePricesOptions = {
  runs: RunRepository
  prices: PriceBook | null
  clock: Clock
}

const noCost: Cost = { amount: 0, currency: "USD" }

export function isCostLate(
  status: EngineStatus,
  engine: GenerationEngine
): boolean {
  return (
    status.state === "succeeded" &&
    status.cost === undefined &&
    engine.creditsOf(noCost) !== null
  )
}

export function withCosts(run: Run, costs: readonly JobCost[]): Run | null {
  const state = run.toState()
  let isChanged = false
  for (const { index, cost } of costs) {
    const job = state.jobs.find((one) => one.index === index)
    if (job !== undefined && job.cost === undefined) {
      job.cost = cost
      isChanged = true
    }
  }
  if (!isChanged) {
    return null
  }
  const isWhole = state.jobs.every((job) => job.cost !== undefined)
  const amount = state.jobs.reduce(
    (sum, job) => sum + (job.cost?.amount ?? 0),
    0
  )
  state.record.cost = isWhole ? { amount, currency: "USD" } : null
  return Run.restore(state)
}

async function lateCostOf(
  engine: GenerationEngine,
  ref: string
): Promise<Cost | null> {
  try {
    const status = await engine.read(ref)
    return status.state === "succeeded" ? (status.cost ?? null) : null
  } catch {
    return null
  }
}

function keepAtMost<K, V>(map: Map<K, V>, key: K, value: V): void {
  map.delete(key)
  map.set(key, value)
  for (const oldest of map.keys()) {
    if (map.size <= LatePrices.heldRuns) {
      return
    }
    map.delete(oldest)
  }
}

function abortOf(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    signal.addEventListener("abort", () => resolve(), { once: true })
  })
}

export class LatePrices {
  static readonly heldRuns = 64
  static readonly saveTries = 3

  private readonly options: LatePricesOptions
  private readonly owed = new Map<RunId, LateJob[]>()
  private readonly writing = new Map<RunId, Promise<void>>()

  constructor(options: LatePricesOptions) {
    this.options = options
  }

  owe(runId: RunId, job: LateJob): void {
    const owed = (this.owed.get(runId) ?? []).filter(
      (one) => one.index !== job.index
    )
    keepAtMost(this.owed, runId, [...owed, job])
  }

  settle(runId: RunId): void {
    const owed = this.owed.get(runId)
    if (owed === undefined) {
      return
    }
    this.owed.delete(runId)
    const writing = this.write(runId, owed).catch(() => undefined)
    keepAtMost(this.writing, runId, writing)
  }

  written(runId: RunId): Promise<void> {
    return this.writing.get(runId) ?? Promise.resolve()
  }

  async *after(
    frames: AsyncGenerator<RunFrame, void, void>,
    input: WatchRunInput
  ): AsyncGenerator<RunFrame, void, void> {
    let last = ""
    for await (const frame of frames) {
      last = JSON.stringify(frame.run)
      yield frame
    }
    const runId = runIdFormat.parse(input.runId)
    const writing = this.writing.get(runId)
    if (writing === undefined || input.signal.aborted) {
      return
    }
    await Promise.race([writing, abortOf(input.signal)])
    if (input.signal.aborted) {
      return
    }
    const record = (await this.options.runs.get(runId))?.toRecord()
    if (record !== undefined && JSON.stringify(record) !== last) {
      yield { run: record }
    }
  }

  private async write(runId: RunId, owed: readonly LateJob[]): Promise<void> {
    const read = await Promise.all(
      owed.map(async (job) => ({
        job,
        cost: await lateCostOf(job.engine, job.ref),
      }))
    )
    const costs = read.flatMap(({ job, cost }) =>
      cost === null ? [] : [{ job, index: job.index, cost }]
    )
    if (costs.length === 0) {
      return
    }
    for (let tries = 0; tries < LatePrices.saveTries; tries += 1) {
      const run = await this.options.runs.get(runId)
      const priced = run === null ? null : withCosts(run, costs)
      if (priced === null) {
        return
      }
      try {
        const saved = await this.options.runs.save(priced)
        await this.record(saved, costs)
        return
      } catch (error) {
        if (!(error instanceof RunConflictError)) {
          throw error
        }
      }
    }
  }

  private async record(
    run: Run,
    costs: readonly (JobCost & { job: LateJob })[]
  ): Promise<void> {
    const now = this.options.clock.now()
    await Promise.all(
      costs.map(({ job, cost }) =>
        recordPrice(this.options.prices, {
          run,
          app: job.app,
          engine: job.engine,
          cost,
          now,
        }).catch(() => undefined)
      )
    )
  }
}
