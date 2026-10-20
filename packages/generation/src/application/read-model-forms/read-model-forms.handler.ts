import { ProjectError } from "@rosesfield/kernel"
import type { GenerationEngine } from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import { hostedModelBinding } from "#domain/task-binding"

export type ReadModelFormsInput = {
  models: readonly string[]
}

export type ReadModelFormsOutput = {
  forms: ModelForm[]
  refusal: ProjectError | null
}

type ReadModelFormsHandlerOptions = {
  engines: readonly GenerationEngine[]
}

type FormRead = {
  form: ModelForm | null
  refusal: ProjectError | null
}

export class ReadModelFormsHandler {
  private readonly engines: readonly GenerationEngine[]

  constructor(options: ReadModelFormsHandlerOptions) {
    this.engines = options.engines
  }

  async execute(input: ReadModelFormsInput): Promise<ReadModelFormsOutput> {
    const reads = await Promise.all(
      [...new Set(input.models)].map((model) => this.read(model))
    )
    return {
      forms: reads.flatMap((one) => (one.form === null ? [] : [one.form])),
      refusal: reads.find((one) => one.refusal !== null)?.refusal ?? null,
    }
  }

  private async read(model: string): Promise<FormRead> {
    const binding = hostedModelBinding(model)
    let refusal: ProjectError | null = null
    for (const engine of this.engines.filter((one) => one.canRun(binding))) {
      try {
        const form = await engine.formOf(binding)
        if (form !== null) {
          return { form, refusal: null }
        }
      } catch (error) {
        if (!(error instanceof ProjectError)) {
          throw error
        }
        refusal ??= error
      }
    }
    return { form: null, refusal }
  }
}
