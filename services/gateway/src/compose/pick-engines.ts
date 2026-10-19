import {
  ComfyGenerationEngine,
  DemoGenerationEngine,
  type Fetch,
  type GenerationEngine,
  RunPodServerlessGenerationEngine,
} from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import { type EngineSettings, withEngineKey } from "#engine/engine-target"

export type EngineOptions = {
  clock: Clock
  fetch?: Fetch
}

function fetchOf(options: EngineOptions): { fetch?: Fetch } {
  return options.fetch === undefined ? {} : { fetch: options.fetch }
}

export function liveEngineOf(
  engine: EngineSettings,
  options: EngineOptions
): GenerationEngine | null {
  switch (engine.target) {
    case "demo":
      return null
    case "runpod-serverless":
      return engine.apiKey === null
        ? null
        : new RunPodServerlessGenerationEngine({
            apiKey: engine.apiKey,
            endpointId: engine.endpointId,
            ...fetchOf(options),
          })
    default:
      return new ComfyGenerationEngine({
        apiKey: engine.apiKey,
        baseUrl: engine.baseUrl,
        ...fetchOf(options),
      })
  }
}

export function pickEngines(
  engine: EngineSettings,
  options: EngineOptions
): readonly GenerationEngine[] {
  const live = liveEngineOf(engine, options)
  return live === null ? [new DemoGenerationEngine(options)] : [live]
}

export function visitorEngines(
  engine: EngineSettings,
  key: string | null,
  options: EngineOptions
): readonly GenerationEngine[] {
  const demo = new DemoGenerationEngine(options)
  const live =
    key === null ? null : liveEngineOf(withEngineKey(engine, key), options)
  return live === null ? [demo] : [live, demo]
}
