import type {
  EngineStatus,
  GenerationEngine,
} from "#domain/generation-engine.port"
import type { Run, RunJob } from "#domain/run"

export type Polled = {
  job: RunJob
  ref: string
  status: EngineStatus
}

export function keepSteps(run: Run, polled: readonly Polled[]): void {
  for (const { job, status } of polled) {
    if ("steps" in status && status.steps !== undefined) {
      run.keepSteps({ index: job.index, steps: status.steps })
    }
  }
}

export function reopenLost(
  run: Run,
  engine: GenerationEngine
): "held" | "reopened" | "unkept" {
  const lost = run.jobs.filter(
    (job) => job.ref !== null && job.status !== "done" && !engine.holds(job.ref)
  )
  if (lost.length === 0) {
    return "held"
  }
  if (engine.idempotency === "none") {
    return "unkept"
  }
  for (const job of lost) {
    run.reopen({ index: job.index })
  }
  return "reopened"
}

export async function cancelAll(
  engine: GenerationEngine,
  refs: readonly string[]
): Promise<unknown> {
  const results = await Promise.allSettled(
    refs.map((ref) => engine.cancel(ref))
  )
  const refused = results.find((result) => result.status === "rejected")
  return refused === undefined ? null : refused.reason
}
