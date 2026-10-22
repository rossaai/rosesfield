import type {
  AppDefinition,
  EngineBinding,
  RunInputs,
} from "@rosesfield/contract"
import {
  InvalidArgumentError,
  NotFoundError,
  PreconditionFailedError,
} from "@rosesfield/kernel"
import type { AppCatalog } from "#domain/app-catalog.port"
import { AppNotFoundError } from "#domain/error/app-not-found.error"
import { isOneAtATime } from "#domain/field-role"
import {
  type GenerationEngine,
  type RunPrice,
  unknownPrice,
} from "#domain/generation-engine.port"
import type { ModelForm } from "#domain/model-form"
import type { PriceBook } from "#domain/price-book.port"
import { pricedRunOf } from "#domain/priced-run"
import { ruledInputsOf } from "#domain/ruled-inputs"
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

export type PriceRunsInput = {
  appId: string
  asks: readonly Omit<PriceRunInput, "appId">[]
}

export type PriceRunsOutput = {
  prices: RunPrice[]
}

type PriceRunHandlerOptions = {
  apps: AppCatalog
  engines: readonly GenerationEngine[]
  prices?: PriceBook
}

export class PriceRunHandler {
  static readonly parallelAsks = 6

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
    const inputs: RunInputs = ruledInputsOf(app, input.inputs)
    const binding = resolveBinding(app.engine, inputs)
    const count = input.count ?? 1
    const runner = this.engines.find((engine) => engine.canRun(binding))
    if (runner?.origin === "demo") {
      return {
        price: await runner.priceOf(binding, { inputs, count }),
      }
    }
    for (const engine of this.engines) {
      const form = await engine.formOf(binding)
      if (form !== null || engine.canRun(binding)) {
        const isPerJob = count > 1 && isJobPerOutput(app, engine, form, binding)
        const measured = await this.measured(engine, app, form, {
          ...input,
          inputs,
          count: isPerJob ? 1 : count,
        })
        return {
          price:
            measured === null
              ? await engine.priceOf(binding, { inputs, count })
              : timesOf(measured, isPerJob ? count : 1),
        }
      }
    }
    return { price: unknownPrice }
  }

  async executeAll(input: PriceRunsInput): Promise<PriceRunsOutput> {
    if (this.apps.find(input.appId) === null) {
      throw new AppNotFoundError({ appId: input.appId })
    }
    const prices: RunPrice[] = new Array(input.asks.length)
    let next = 0
    const lane = async (): Promise<void> => {
      for (let at = next++; at < input.asks.length; at = next++) {
        const ask = input.asks[at]
        if (ask !== undefined) {
          prices[at] = await this.priceOne({ ...ask, appId: input.appId })
        }
      }
    }
    const lanes = Math.min(PriceRunHandler.parallelAsks, input.asks.length)
    await Promise.all(Array.from({ length: lanes }, lane))
    return { prices }
  }

  private async priceOne(input: PriceRunInput): Promise<RunPrice> {
    try {
      return (await this.execute(input)).price
    } catch (error) {
      if (isRowRefusal(error)) {
        return unknownPrice
      }
      throw error
    }
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

function isRowRefusal(error: unknown): boolean {
  return (
    error instanceof NotFoundError ||
    error instanceof InvalidArgumentError ||
    error instanceof PreconditionFailedError
  )
}

function isJobPerOutput(
  app: AppDefinition,
  engine: GenerationEngine,
  form: ModelForm | null,
  binding: EngineBinding
): boolean {
  return form === null
    ? engine.outputsPerJob(binding) === "one"
    : isOneAtATime(form.fields, app.output.kind)
}

function timesOf(price: RunPrice, times: number): RunPrice {
  return price.credits === null
    ? price
    : { ...price, credits: Math.round(price.credits * times * 100) / 100 }
}
