import {
  ComfyGenerationEngine,
  ComfyRouterGenerationEngine,
  DemoGenerationEngine,
  type Fetch,
  type GenerationEngine,
  type RouterCatalog,
} from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import { sharedRouterCatalog } from "#catalog/shared-router-catalog"
import { type EngineSettings, withEngineKey } from "#engine/engine-target"
import { EnvInvalidError } from "#error/env-invalid.error"

const comfyKeyPrefix = "comfyui-"

export type EngineOptions = {
  clock: Clock
  fetch?: Fetch
  catalog?: RouterCatalog
  warmCatalog?: boolean
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
      throw new EnvInvalidError({
        problems: [
          "RUNPOD_ENDPOINT_ID is set, and Rosesfield no longer runs on RunPod Serverless. Run ComfyUI behind comfy-api-proxy in a RunPod pod and set COMFY_BASE_URL to its address.",
        ],
      })
    default:
      return new ComfyGenerationEngine({
        apiKey: engine.apiKey,
        baseUrl: engine.baseUrl,
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

export function pickEngines(
  engine: EngineSettings,
  options: EngineOptions
): readonly GenerationEngine[] {
  const live = liveEngineOf(engine, options)
  const router = routerOf(hostedKeyOf(engine), options)
  return live === null
    ? [router, new DemoGenerationEngine(options)]
    : [live, router]
}

export function visitorEngines(
  engine: EngineSettings,
  key: string | null,
  options: EngineOptions
): readonly GenerationEngine[] {
  const demo = new DemoGenerationEngine(options)
  const keyed = key === null ? engine : withEngineKey(engine, key)
  const live = key === null ? null : liveEngineOf(keyed, options)
  const router = routerOf(key === null ? null : hostedKeyOf(keyed), options)
  return live === null ? [router, demo] : [live, router, demo]
}
