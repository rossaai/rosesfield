import {
  type MediaTool,
  RemakeGenerationEngine,
  RouterPlanTurn,
} from "@rosesfield/catalog/remake"
import {
  ComfyGenerationEngine,
  ComfyRouterGenerationEngine,
  type CreditMeter,
  DemoGenerationEngine,
  type Fetch,
  type GenerationEngine,
  type PriceBook,
  type RouterCatalog,
} from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import { sharedRouterCatalog } from "#catalog/shared-router-catalog"
import {
  checkEngineSettings,
  type EngineSettings,
  withEngineKey,
} from "#engine/engine-target"

const comfyKeyPrefix = "comfyui-"

export type EngineOptions = {
  clock: Clock
  fetch?: Fetch
  catalog?: RouterCatalog
  meter?: CreditMeter
  warmCatalog?: boolean
  media?: MediaTool
  prices?: PriceBook
}

function meterOf(options: EngineOptions): { meter?: CreditMeter } {
  return options.meter === undefined ? {} : { meter: options.meter }
}

function fetchOf(options: EngineOptions): { fetch?: Fetch } {
  return options.fetch === undefined ? {} : { fetch: options.fetch }
}

function routerOf(
  apiKey: string | null,
  options: EngineOptions
): GenerationEngine {
  const router = new ComfyRouterGenerationEngine({
    apiKey,
    catalog: options.catalog ?? sharedRouterCatalog(options.clock),
    ...meterOf(options),
    ...fetchOf(options),
  })
  if (options.warmCatalog === true) {
    router.warmCatalog()
  }
  return router
}

export function liveEngineOf(
  engine: EngineSettings,
  options: EngineOptions
): GenerationEngine | null {
  switch (engine.target) {
    case "demo":
      return null
    case "runpod-serverless":
      return null
    default:
      return new ComfyGenerationEngine({
        apiKey: engine.apiKey,
        baseUrl: engine.baseUrl,
        ...meterOf(options),
        ...fetchOf(options),
      })
  }
}

function hostedKeyOf(engine: EngineSettings): string | null {
  if (engine.target === "demo" || engine.target === "runpod-serverless") {
    return null
  }
  const key = engine.apiKey
  return key?.startsWith(comfyKeyPrefix) === true ? key : null
}

function withRemake(
  engines: readonly GenerationEngine[],
  key: string | null,
  options: EngineOptions
): readonly GenerationEngine[] {
  if (options.media === undefined) {
    return engines
  }
  const remake = new RemakeGenerationEngine({
    engines,
    media: options.media,
    plan: new RouterPlanTurn({ apiKey: key, ...fetchOf(options) }),
    ...(options.prices === undefined ? {} : { prices: options.prices }),
  })
  return [remake, ...engines]
}

export function pickEngines(
  engine: EngineSettings,
  options: EngineOptions
): readonly GenerationEngine[] {
  checkEngineSettings(engine)
  const live = liveEngineOf(engine, options)
  const router = routerOf(hostedKeyOf(engine), options)
  return live === null
    ? [
        router,
        new DemoGenerationEngine({ clock: options.clock, rates: router }),
      ]
    : withRemake([live, router], hostedKeyOf(engine), options)
}

export function visitorEngines(
  engine: EngineSettings,
  key: string | null,
  options: EngineOptions
): readonly GenerationEngine[] {
  const keyed = key === null ? engine : withEngineKey(engine, key)
  const live = key === null ? null : liveEngineOf(keyed, options)
  const router = routerOf(key === null ? null : hostedKeyOf(keyed), options)
  const demo = new DemoGenerationEngine({ clock: options.clock, rates: router })
  return live === null ? [router, demo] : [live, router, demo]
}
