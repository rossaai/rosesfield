import type { AppDefinition, Cost } from "@rosesfield/contract"
import { isRetryable, noOutput } from "#application/advance-run/end-run"
import type { Polled } from "#application/advance-run/engine-steps"
import {
  type KeptOutputs,
  keepOutputs,
} from "#application/advance-run/keep-outputs"
import { recordPrice } from "#application/advance-run/record-price"
import { mayKeepLater } from "#application/advance-run/run-timing"
import type {
  EngineFinished,
  EngineOutput,
  GenerationEngine,
} from "#domain/generation-engine.port"
import type { PriceBook } from "#domain/price-book.port"
import type { Run } from "#domain/run"
import type { RunAssets } from "#domain/run-assets.port"
import { resolveBinding } from "#domain/select-binding"

export type Watch = {
  app: AppDefinition
  engine: GenerationEngine
}

export type KeepPorts = {
  assets: RunAssets
  prices: PriceBook | null
  now: Date
}

export type Collected = "kept" | "empty" | "retry"

function resultsOf(run: Run, watch: Watch): readonly string[] | null {
  if (run.toRecord().place === "held") {
    return []
  }
  return watch.engine.resultNodesOf(
    resolveBinding(watch.app.engine, run.toRecord().inputs)
  )
}

export async function keepJob(
  ports: KeepPorts,
  run: Run,
  watch: Watch,
  job: { index: number; kept: KeptOutputs; cost: Cost | null }
): Promise<void> {
  const { index, kept, cost } = job
  run.keepJob({ ...kept, index, cost, now: ports.now })
  await recordPrice(ports.prices, {
    run,
    app: watch.app,
    engine: watch.engine,
    cost,
    now: ports.now,
  }).catch(() => undefined)
}

export async function keepFinished(
  ports: KeepPorts,
  run: Run,
  watch: Watch,
  job: { index: number; finished: EngineFinished }
): Promise<void> {
  const { outputs, cost } = job.finished
  const kept = await keepOutputs(
    run,
    watch.app,
    outputs,
    ports.assets,
    resultsOf(run, watch)
  )
  if (kept === null) {
    run.fail({ error: noOutput(), now: ports.now })
    return
  }
  await keepJob(ports, run, watch, { index: job.index, kept, cost })
}

export async function collectJob(
  ports: KeepPorts,
  run: Run,
  polled: Polled,
  watch: Watch
): Promise<Collected> {
  const index = polled.job.index
  let outputs: EngineOutput[]
  try {
    outputs = await watch.engine.listOutputs(polled.ref, run.toRecord().inputs)
  } catch (error) {
    if (!isRetryable(error)) {
      throw error
    }
    run.collecting({ index, now: ports.now })
    return "retry"
  }
  let kept: KeptOutputs | null
  try {
    kept = await keepOutputs(
      run,
      watch.app,
      outputs,
      ports.assets,
      resultsOf(run, watch)
    )
  } catch (error) {
    if (!mayKeepLater(run, watch.app, error, ports.now)) {
      throw error
    }
    run.collecting({ index, now: ports.now })
    run.retried()
    return "retry"
  }
  if (kept === null) {
    return "empty"
  }
  const { status } = polled
  const cost = status.state === "succeeded" ? (status.cost ?? null) : null
  await keepJob(ports, run, watch, { index, kept, cost })
  return "kept"
}
