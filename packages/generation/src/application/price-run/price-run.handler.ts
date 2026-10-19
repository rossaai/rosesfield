import type {
  AppDefinition,
  EngineBinding,
  RunInputs,
} from "@rosesfield/contract"
import type { AppCatalog } from "#domain/app-catalog.port"
import { AppNotFoundError } from "#domain/error/app-not-found.error"
import { fieldOfRole } from "#domain/field-role"
import {
  type GenerationEngine,
  type RunPrice,
  unknownPrice,
} from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import type { PriceBook } from "#domain/price-book.port"
import { pricedRunOf } from "#domain/priced-run"
import { resolveBinding } from "#domain/select-binding"

export type PriceRunInput = {
  appId: string
  inputs: RunInputs
  count?: number
  aspectRatio?: string | null
}

export type PriceRunOutput = {
  price: RunPrice
}

type PriceRunHandlerOptions = {
  apps: AppCatalog
  engines: readonly GenerationEngine[]
  prices?: PriceBook
}

export class PriceRunHandler {
  private readonly apps: AppCatalog
  private readonly engines: readonly GenerationEngine[]
  private readonly prices: PriceBook | null

  constructor(options: PriceRunHandlerOptions) {
    this.apps = options.apps
    this.engines = options.engines
    this.prices = options.prices ?? null
  }

  async execute(input: PriceRunInput): Promise<PriceRunOutput> {
    const app = this.apps.find(input.appId)
    if (app === null) {
      throw new AppNotFoundError({ appId: input.appId })
    }
    const binding = resolveBinding(app.engine, input.inputs)
    const count = input.count ?? 1
    for (const engine of this.engines) {
      const form = await engine.formOf(binding)
      if (form !== null || engine.canRun(binding)) {
        const isPerJob = count > 1 && isJobPerOutput(app, engine, form, binding)
        const measured = await this.measured(engine, app, form, {
          ...input,
          count: isPerJob ? 1 : count,
        })
        return {
          price:
            measured === null
              ? await engine.priceOf(binding, { inputs: input.inputs, count })
              : timesOf(measured, isPerJob ? count : 1),
        }
      }
    }
    return { price: unknownPrice }
  }

  private async measured(
    engine: GenerationEngine,
    app: AppDefinition,
    form: ModelForm | null,
    input: PriceRunInput
  ): Promise<RunPrice | null> {
    if (this.prices === null) {
      return null
    }
    const cost = await this.prices.find(
      pricedRunOf({
        app,
        inputs: input.inputs,
        form,
        count: input.count ?? 1,
        aspectRatio: input.aspectRatio ?? null,
      })
    )
    const credits = cost === null ? null : engine.creditsOf(cost)
    return credits === null
      ? null
      : { source: "measured", credits: Math.round(credits * 100) / 100 }
  }
}

function isJobPerOutput(
  app: AppDefinition,
  engine: GenerationEngine,
  form: ModelForm | null,
  binding: EngineBinding
): boolean {
  return form === null
    ? engine.outputsPerJob(binding) === "one"
    : fieldOfRole(form.fields, "count", app.output.kind) === null
}

function timesOf(price: RunPrice, times: number): RunPrice {
  return price.credits === null
    ? price
    : { ...price, credits: Math.round(price.credits * times * 100) / 100 }
}
