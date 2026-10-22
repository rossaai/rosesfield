import type { Cost } from "@rosesfield/contract"
import { type Clock, type RunId, runIdFormat } from "@rosesfield/kernel"
import type { Watch } from "#application/advance-run/keep-job"
import { recordPrice } from "#application/advance-run/record-price"
import type {
  RunFrame,
  WatchRunInput,
} from "#application/watch-run/watch-run.handler"
import { RunConflictError } from "#domain/error/run-conflict.error"
import type { AppCatalog } from "#domain/app-catalog.port"
import type { GenerationEngine } from "#domain/generation-engine.port"
import type { PriceBook } from "#domain/price-book.port"
import { Run } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"

type OwedJob = { index: number; ref: string }

type JobCost = { index: number; cost: Cost }

type LatePricesOptions = {
  apps: AppCatalog
  runs: RunRepository
  engines: readonly GenerationEngine[]
  prices: PriceBook | null
  clock: Clock
}

const noCost: Cost = { amount: 0, currency: "USD" }

function owedOf(run: Run, engine: GenerationEngine): OwedJob[] {
  if (engine.creditsOf(noCost) === null) {
    return []
  }
  return run.jobs.flatMap((job) =>
    job.status === "done" && job.ref !== null && job.cost === undefined
      ? [{ index: job.index, ref: job.ref }]
      : []
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
  private readonly writing = new Map<RunId, Promise<void>>()

  constructor(options: LatePricesOptions) {
    this.options = options
  }

  settle(runId: RunId): Promise<void> {
    const writing = this.write(runId).catch(() => undefined)
    keepAtMost(this.writing, runId, writing)
    return writing
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

  private async write(runId: RunId): Promise<void> {
    const ended = await this.options.runs.get(runId)
    const watch = ended === null ? null : this.watchOf(ended)
    if (ended === null || watch === null) {
      return
    }
    const read = await Promise.all(
      owedOf(ended, watch.engine).map(async (job) => ({
        index: job.index,
        cost: await lateCostOf(watch.engine, job.ref),
      }))
    )
    const costs = read.flatMap(({ index, cost }) =>
      cost === null ? [] : [{ index, cost }]
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
        await this.record(saved, watch, costs)
        return
      } catch (error) {
        if (!(error instanceof RunConflictError)) {
          throw error
        }
      }
    }
  }

  private watchOf(run: Run): Watch | null {
    const app = this.options.apps.find(run.appId)
    const engine = this.options.engines.find(
      (candidate) => candidate.key === run.adapter
    )
    return app === null || engine === undefined ? null : { app, engine }
  }

  private async record(
    run: Run,
    watch: Watch,
    costs: readonly JobCost[]
  ): Promise<void> {
    const now = this.options.clock.now()
    await Promise.all(
      costs.map(({ cost }) =>
        recordPrice(this.options.prices, {
          run,
          app: watch.app,
          engine: watch.engine,
          cost,
          now,
        }).catch(() => undefined)
      )
    )
  }
}
