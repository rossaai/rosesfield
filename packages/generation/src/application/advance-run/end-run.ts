import type { AppDefinition } from "@rosesfield/contract"
import { type ProjectError, RateLimitedError } from "@rosesfield/kernel"
import { cancelAll, type Polled } from "#application/advance-run/engine-steps"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import { RunFailedError } from "#domain/error/run-failed.error"
import { RunTimedOutError } from "#domain/error/run-timed-out.error"
import {
  type GenerationEngine,
  isWorkingStatus,
} from "#domain/generation-engine.port"
import type { Run } from "#domain/run"
import type { RunRepository } from "#domain/run.repository"

export type EndRunPorts = {
  runs: RunRepository
  engine: GenerationEngine
  now: Date
}

export function isRetryable(error: unknown): boolean {
  return (
    error instanceof RateLimitedError || error instanceof EngineUnavailableError
  )
}

export function noOutput(): RunFailedError {
  return new RunFailedError({ cause: "no output of the app's kind" })
}

export async function endRun(
  ports: EndRunPorts,
  run: Run,
  polled: readonly Polled[],
  ending: ProjectError | "cancelled"
): Promise<void> {
  const working = polled.flatMap((one) =>
    isWorkingStatus(one.status) ? [one.ref] : []
  )
  const refused = await cancelAll(ports.engine, working)
  if (ending === "cancelled") {
    run.cancel({ now: ports.now })
  } else {
    run.fail({ error: ending, now: ports.now })
  }
  await ports.runs.save(run)
  if (refused !== null) {
    throw refused
  }
}

export async function timeOutRun(
  ports: EndRunPorts,
  run: Run,
  app: AppDefinition
): Promise<void> {
  const refused = await cancelAll(ports.engine, run.liveRefs())
  run.fail({
    error: new RunTimedOutError({
      runId: run.id,
      limitSeconds: app.limits.timeoutSeconds,
    }),
    now: ports.now,
  })
  await ports.runs.save(run)
  if (refused !== null) {
    throw refused
  }
}
