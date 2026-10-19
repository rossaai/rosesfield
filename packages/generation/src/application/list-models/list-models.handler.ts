import type {
  GenerationEngine,
  HostedModel,
} from "#domain/generation-engine.port"

export type ListModelsInput = Record<string, never>

export type ListModelsOutput = {
  models: HostedModel[]
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
    const lists = await Promise.all(
      this.engines.map((engine) => engine.listModels())
    )
    const seen = new Set<string>()
    const models = lists.flat().filter((model) => {
      if (seen.has(model.id)) {
        return false
      }
      seen.add(model.id)
      return true
    })
    return { models }
  }
}
