import { ProjectError } from "@rosesfield/kernel"
import type {
  GenerationEngine,
  HostedModel,
} from "#domain/generation-engine.port"

export type ListModelsInput = Record<string, never>

export type ListModelsOutput = {
  models: HostedModel[]
  refusal: ProjectError | null
}

type ListModelsHandlerOptions = {
  engines: readonly GenerationEngine[]
}

export class ListModelsHandler {
  private readonly engines: readonly GenerationEngine[]

  constructor(options: ListModelsHandlerOptions) {
    this.engines = options.engines
  }

  async execute(_input: ListModelsInput): Promise<ListModelsOutput> {
    const lists = await Promise.allSettled(
      this.engines.map((engine) => engine.listModels())
    )
    let refusal: ProjectError | null = null
    const seen = new Set<string>()
    const models: HostedModel[] = []
    for (const list of lists) {
      if (list.status === "rejected") {
        if (!(list.reason instanceof ProjectError)) {
          throw list.reason
        }
        refusal ??= list.reason
        continue
      }
      for (const model of list.value) {
        if (!seen.has(model.id)) {
          seen.add(model.id)
          models.push(model)
        }
      }
    }
    return { models, refusal }
  }
}
