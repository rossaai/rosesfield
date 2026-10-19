import type { EngineRequest } from "#domain/generation-engine.port"
import type { RunJob } from "#domain/run"
import { hostedModelOf } from "#domain/task-binding"

const seedInput = "seed"

export function jobInputsOf(
  base: EngineRequest,
  job: RunJob,
  jobCount: number
): EngineRequest["inputs"] {
  const seed = base.inputs[seedInput]
  return jobCount > 1 &&
    job.seed !== null &&
    typeof seed === "number" &&
    hostedModelOf(base.binding) !== null
    ? { ...base.inputs, [seedInput]: job.seed }
    : base.inputs
}
