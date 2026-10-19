import type { AppDefinition } from "@rosesfield/contract"
import { type ProjectError, RateLimitedError } from "@rosesfield/kernel"
import type {
  EngineStatus,
  GenerationEngine,
} from "#domain/generation-engine.port"
import type { Run } from "#domain/run"

export const pollMs = 2000

export const maxBackoffMs = 60_000

export const collectRetryMs = 30_000

export const resultKeptMs = 86_400_000

export const submitClaimMs = 120_000

export function backoffMs(attempts: number, error: ProjectError): number {
  if (error instanceof RateLimitedError && error.retryAfterSeconds !== null) {
    return error.retryAfterSeconds * 1000
  }
  return Math.min(maxBackoffMs, 1000 * 2 ** attempts)
}

export function wakeMs(statuses: readonly EngineStatus[]): number {
  const waits: number[] = []
  let isWorking = false
  for (const status of statuses) {
    if (status.state === "queued" || status.state === "running") {
      isWorking = true
      if (status.retryAfterSeconds !== null) {
        waits.push(status.retryAfterSeconds * 1000)
      }
    }
  }
  if (!isWorking) {
    return collectRetryMs
  }
  return waits.length === 0 ? pollMs : Math.min(...waits)
}

export function isPastResultKept(run: Run, now: Date): boolean {
  const since = run.collectingSince()
  return since !== null && now.getTime() - since.getTime() > resultKeptMs
}

export function isPastLimit(run: Run, app: AppDefinition, now: Date): boolean {
  const elapsed = now.getTime() - run.createdAt.getTime()
  return elapsed > app.limits.timeoutSeconds * 1000
}

export function isClaimHeld(run: Run, now: Date): boolean {
  const since = run.submittingSince()
  return since !== null && now.getTime() - since.getTime() < submitClaimMs
}

export function isSubmitDue(run: Run, engine: GenerationEngine): boolean {
  const jobs = run.jobs
  if (!jobs.some((job) => job.status === "pending")) {
    return false
  }
  return (
    !engine.submitsAlone() ||
    !jobs.some((job) => job.ref !== null && job.status !== "done")
  )
}
