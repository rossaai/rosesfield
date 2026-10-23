import type { Clock, RunId } from "@rosesfield/kernel"
import { isPastLimit } from "#application/advance-run/run-timing"
import {
  type WatchMarkPort,
  WatchMarks,
} from "#application/advance-run/watch-marks"
import {
  type WatchedRun,
  WatchRunHandler,
} from "#application/watch-run/watch-run.handler"
import type { AppCatalog } from "#domain/app-catalog.port"
import type {
  EngineStatus,
  GenerationEngine,
} from "#domain/generation-engine.port"
import type { Run } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"

export type RunWatchPorts = {
  apps: AppCatalog
  runs: RunRepository
  engines: readonly GenerationEngine[]
  clock: Clock
  marks: WatchMarks
  shared: WatchMarkPort | null
  advance: (
    runId: RunId,
    known: ReadonlyMap<string, EngineStatus>
  ) => Promise<number | null>
}

export function runWatchOf(ports: RunWatchPorts): WatchRunHandler {
  const { apps, runs, engines, clock, marks, shared } = ports
  const find = async (runId: RunId): Promise<WatchedRun | null> => {
    const run = await runs.get(runId)
    if (run === null) {
      return null
    }
    const engine = engines.find((one) => one.key === run.adapter)
    return { run, engine: engine ?? null }
  }
  const isOverdue = (run: Run): boolean => {
    const app = apps.find(run.appId)
    return (
      app !== null &&
      isPastLimit(run, app, clock.now()) &&
      run.collectingSince() === null
    )
  }
  return new WatchRunHandler({
    find,
    advance: ports.advance,
    keep: (run) => runs.save(run),
    isOverdue,
    mark: async (runId) => {
      marks.mark(runId, clock.now())
      await shared?.mark(runId).catch(() => undefined)
    },
    unmark: async (runId) => {
      marks.clear(runId)
      await shared?.clear(runId).catch(() => undefined)
    },
    renewMs: WatchMarks.renewMs,
  })
}
