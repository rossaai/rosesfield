import type { RunInputs } from "@rosesfield/contract"
import type { AppCatalog } from "#domain/app-catalog.port"
import { AppNotFoundError } from "#domain/error/app-not-found.error"
import {
  type GenerationEngine,
  type RunPrice,
  unknownPrice,
} from "#domain/generation-engine.port"
import { resolveBinding } from "#domain/select-binding"

export type PriceRunInput = {
  appId: string
  inputs: RunInputs
}

export type PriceRunOutput = {
  price: RunPrice
}

type PriceRunHandlerOptions = {
  apps: AppCatalog
  engines: readonly GenerationEngine[]
}

export class PriceRunHandler {
  private readonly apps: AppCatalog
  private readonly engines: readonly GenerationEngine[]

  constructor(options: PriceRunHandlerOptions) {
    this.apps = options.apps
    this.engines = options.engines
  }

  async execute(input: PriceRunInput): Promise<PriceRunOutput> {
    const app = this.apps.find(input.appId)
    if (app === null) {
      throw new AppNotFoundError({ appId: input.appId })
    }
    const binding = resolveBinding(app.engine, input.inputs)
    for (const engine of this.engines) {
      if ((await engine.formOf(binding)) !== null || engine.canRun(binding)) {
        return {
          price: await engine.priceOf(binding, {
            inputs: input.inputs,
            count: 1,
          }),
        }
      }
    }
    return { price: unknownPrice }
  }
}
