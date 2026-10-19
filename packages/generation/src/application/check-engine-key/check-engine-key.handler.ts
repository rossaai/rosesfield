import type { KeyCheck, RunOrigin } from "@rosesfield/contract"
import type { GenerationEngine } from "#domain/generation-engine.port"

export type CheckEngineKeyInput = Record<string, never>

export type EngineKeyCheck = {
  engine: string
  origin: RunOrigin
  check: KeyCheck
}

export type CheckEngineKeyOutput = {
  checks: EngineKeyCheck[]
}

type CheckEngineKeyHandlerOptions = {
  engines: readonly GenerationEngine[]
}

export class CheckEngineKeyHandler {
  private readonly engines: readonly GenerationEngine[]

  constructor(options: CheckEngineKeyHandlerOptions) {
    this.engines = options.engines
  }

  async execute(_input: CheckEngineKeyInput): Promise<CheckEngineKeyOutput> {
    const checks = await Promise.all(
      this.engines.map(async (engine) => ({
        engine: engine.key,
        origin: engine.origin,
        check: await engine.checkKey(),
      }))
    )
    return { checks }
  }
}
