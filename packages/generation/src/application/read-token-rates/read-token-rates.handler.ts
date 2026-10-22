import type {
  GenerationEngine,
  TokenRate,
} from "#domain/generation-engine.port"

export type ReadTokenRatesInput = {
  models: readonly string[]
}

export type ReadTokenRatesOutput = {
  rates: ReadonlyMap<string, TokenRate>
}

type ReadTokenRatesHandlerOptions = {
  engines: readonly GenerationEngine[]
}

export class ReadTokenRatesHandler {
  private readonly engines: readonly GenerationEngine[]

  constructor(options: ReadTokenRatesHandlerOptions) {
    this.engines = options.engines
  }

  async execute(input: ReadTokenRatesInput): Promise<ReadTokenRatesOutput> {
    const reads = await Promise.allSettled(
      this.engines.map((engine) => engine.tokenRatesOf(input.models))
    )
    const rates = new Map<string, TokenRate>()
    for (const read of reads) {
      if (read.status !== "fulfilled") {
        continue
      }
      for (const [model, rate] of read.value) {
        if (!rates.has(model)) {
          rates.set(model, rate)
        }
      }
    }
    return { rates }
  }
}
