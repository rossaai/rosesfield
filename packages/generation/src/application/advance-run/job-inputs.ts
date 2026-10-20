import { fieldOfRole } from "#domain/field-role"
import type { EngineRequest } from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import { Run, type RunJob } from "#domain/run"

export function jobInputsOf(
  base: EngineRequest,
  job: RunJob,
  jobCount: number,
  form: ModelForm | null
): EngineRequest["inputs"] {
  const field =
    form === null ? null : fieldOfRole(form.fields, "seed", base.outputKind)
  const given = field === null ? undefined : base.inputs[field.name]
  if (
    jobCount < 2 ||
    field === null ||
    field.kind !== "number" ||
    typeof given !== "number"
  ) {
    return base.inputs
  }
  const min = field.min ?? 0
  const max = field.max ?? Math.max(Run.maxSeed, given)
  const span = max - min + 1
  const seed = min + ((((given - min + job.index) % span) + span) % span)
  return { ...base.inputs, [field.name]: seed }
}
