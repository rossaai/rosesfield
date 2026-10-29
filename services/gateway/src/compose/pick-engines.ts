import {
  ClipPlanGenerationEngine,
  DemoClipPlanTurn,
  MediaClipFrames,
  RouterClipPlanTurn,
} from "@rosesfield/catalog/motion/engine"
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
  type EngineFiles,
  type Fetch,
  type GenerationEngine,
  type PriceBook,
  type RouterCatalog,
} from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import type { AssetStore } from "@rosesfield/library"
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
  store?: AssetStore
  prices?: PriceBook
  files?: EngineFiles
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
        ...(options.files === undefined ? {} : { files: options.files }),
      })
  }
}

/** The plan of a Motion clip: on the Router with the key, or the demo engine's own plan with none, reading the clip's frames with ffmpeg where this server runs it. */
function clipPlanOf(
  key: string | null,
  live: GenerationEngine | null,
  options: EngineOptions
): GenerationEngine {
  const frames =
    options.media === undefined
      ? null
      : new MediaClipFrames({ tool: options.media })
  return live === null
    ? new ClipPlanGenerationEngine({
        turn: new DemoClipPlanTurn(),
        origin: "demo",
        frames,
      })
    : new ClipPlanGenerationEngine({
        turn: new RouterClipPlanTurn({ apiKey: key, ...fetchOf(options) }),
        origin: "live",
        frames,
      })
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
  const { media, store } = options
  if (media === undefined || store === undefined) {
    return engines
  }
  const remake = new RemakeGenerationEngine({
    engines,
    media,
    store,
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
  const key = hostedKeyOf(engine)
  const router = routerOf(key, options)
  const plan = clipPlanOf(key, live, options)
  return live === null
    ? [
        router,
        plan,
        new DemoGenerationEngine({ clock: options.clock, rates: router }),
      ]
    : [...withRemake([live, router], key, options), plan]
}

type KeyedEngines = {
  live: GenerationEngine | null
  router: GenerationEngine
  demo: GenerationEngine
  hostedKey: string | null
}

function keyedEngines(
  engine: EngineSettings,
  key: string | null,
  options: EngineOptions
): KeyedEngines {
  const keyed = key === null ? engine : withEngineKey(engine, key)
  const live = key === null ? null : liveEngineOf(keyed, options)
  const hostedKey = key === null ? null : hostedKeyOf(keyed)
  const router = routerOf(hostedKey, options)
  const demo = new DemoGenerationEngine({ clock: options.clock, rates: router })
  return { live, router, demo, hostedKey }
}

export function visitorEngines(
  engine: EngineSettings,
  key: string | null,
  options: EngineOptions
): readonly GenerationEngine[] {
  const { live, router, demo, hostedKey } = keyedEngines(engine, key, options)
  const plan = clipPlanOf(hostedKey, live, options)
  return live === null ? [router, plan, demo] : [live, router, plan, demo]
}

export function pastedKeyEngines(
  engine: EngineSettings,
  key: string | null,
  options: EngineOptions
): readonly GenerationEngine[] {
  const { live, router, demo, hostedKey } = keyedEngines(engine, key, options)
  const plan = clipPlanOf(hostedKey, live, options)
  return live === null
    ? [router, plan, demo]
    : [...withRemake([live, router], hostedKey, options), plan, demo]
}
