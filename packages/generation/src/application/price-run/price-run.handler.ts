import type {
  AppDefinition,
  Cost,
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
  type KnownPrice,
  type PriceFrom,
  type RunPrice,
  unknownPrice,
} from "#domain/generation-engine.port"
import {
  inputsOfKept,
  type KeptRun,
  keptCountOf,
  medianOf,
  nearestKeptOf,
  scaledCreditsOf,
} from "#domain/kept-settings"
import type { ModelForm } from "#domain/model-form"
import type { PriceBook } from "#domain/price-book.port"
import { type PricedRun, pricedRunOf } from "#domain/priced-run"
import { ruledInputsOf } from "#domain/ruled-inputs"
import { resolveBinding } from "#domain/select-binding"
import { sameTaskGraphsOf } from "#domain/task-binding"

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

  static readonly quoteTolerance = 0.05

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
    const found = await this.engineOf(binding)
    if (found === null) {
      return { price: unknownPrice }
    }
    const { engine, form } = found
    const asked = { ...input, inputs, count }
    const perOutput = isJobPerOutput(app, engine, form, binding)
    const isPerJob = count > 1 && perOutput
    const measured = await this.measured(app, form, {
      ...asked,
      count: isPerJob ? 1 : count,
    })
    if (measured !== null) {
      const each = perOutput ? { perOutput: true as const } : {}
      return { price: { ...timesOf(measured, isPerJob ? count : 1), ...each } }
    }
    const quoted = await engine.priceOf(binding, { inputs, count })
    if (quoted.credits !== null) {
      return {
        price: await this.heldToMeasured(engine, app, form, quoted, asked),
      }
    }
    return {
      price: form === null ? await this.fromGraphRuns(app, asked) : quoted,
    }
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

  /**
   * A quote the rate card or the estimate gave is set against the model's
   * nearest measured run. When the same source priced that run's settings
   * more than a tolerance away from what it cost, the quote is scaled by the
   * measured ratio and named an estimate, so it never contradicts a run.
   */
  private async heldToMeasured(
    engine: GenerationEngine,
    app: AppDefinition,
    form: ModelForm | null,
    quoted: KnownPrice,
    input: PriceRunInput
  ): Promise<KnownPrice> {
    if (this.prices === null || form === null) {
      return quoted
    }
    const asked = pricedRunOf({
      app,
      inputs: input.inputs,
      form,
      count: input.count ?? 1,
      aspectRatio: input.aspectRatio ?? null,
    })
    const nearest = nearestKeptOf(
      asked.settings,
      await this.prices.runsOf(asked.model)
    )
    const measured = nearest === null ? null : this.creditsOf(nearest.cost)
    if (nearest === null || measured === null || measured <= 0) {
      return quoted
    }
    const keptInputs = inputsOfKept(form, nearest.settings, input.inputs)
    const atKept = await engine.priceOf(
      resolveBinding(app.engine, keptInputs),
      {
        inputs: keptInputs,
        count: keptCountOf(nearest.settings),
      }
    )
    if (atKept.credits === null || atKept.credits <= 0) {
      return quoted
    }
    const ratio = measured / atKept.credits
    return Math.abs(ratio - 1) <= PriceRunHandler.quoteTolerance
      ? quoted
      : { ...scaledBy(quoted, ratio), source: "estimate" }
  }

  private async measured(
    app: AppDefinition,
    form: ModelForm | null,
    input: PriceRunInput
  ): Promise<KnownPrice | null> {
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
    const credits = cost === null ? null : this.creditsOf(cost)
    return credits === null
      ? null
      : { source: "measured", credits: centsOf(credits), from: "measured" }
  }

  /**
   * A graph no engine quotes is priced from what graphs cost: the nearest
   * measured run of the same graph scaled to the asked outputs and seconds,
   * or else the median of the measured runs of the app's graphs that run the
   * same task, scaled the same way. A run that names no seconds is skipped
   * when the asked run names them. Either is an estimate.
   */
  private async fromGraphRuns(
    app: AppDefinition,
    input: PriceRunInput
  ): Promise<RunPrice> {
    const book = this.prices
    if (book === null) {
      return unknownPrice
    }
    const asked = pricedRunOf({
      app,
      inputs: input.inputs,
      form: null,
      count: input.count ?? 1,
      aspectRatio: input.aspectRatio ?? null,
    })
    const scalable = (await book.runsOf(asked.model)).filter(
      (run) => this.scaledRun(run, asked) !== null
    )
    const nearest = nearestKeptOf(asked.settings, scalable)
    const own = nearest === null ? null : this.scaledRun(nearest, asked)
    if (own !== null) {
      return estimateOf(own, "model-runs")
    }
    const peers = await Promise.all(
      sameTaskGraphsOf(app, asked.model).map((graph) => book.runsOf(graph))
    )
    const median = medianOf(
      peers.flat().flatMap((run) => {
        const scaled = this.scaledRun(run, asked)
        return scaled === null ? [] : [scaled]
      })
    )
    return median === null ? unknownPrice : estimateOf(median, "task-runs")
  }

  private scaledRun(run: KeptRun<Cost>, asked: PricedRun): number | null {
    const credits = this.creditsOf(run.cost)
    return credits === null || credits <= 0
      ? null
      : scaledCreditsOf(credits, run.settings, asked.settings)
  }

  private creditsOf(cost: Cost): number | null {
    for (const engine of this.engines) {
      const credits = engine.creditsOf(cost)
      if (credits !== null) {
        return credits
      }
    }
    return null
  }

  private async engineOf(binding: EngineBinding): Promise<FoundEngine | null> {
    for (const engine of this.engines) {
      const form = await engine.formOf(binding)
      if (form !== null || engine.canRun(binding)) {
        return { engine, form }
      }
    }
    return null
  }
}

type FoundEngine = { engine: GenerationEngine; form: ModelForm | null }

function centsOf(credits: number): number {
  return Math.round(credits * 100) / 100
}

function estimateOf(credits: number, from: PriceFrom): KnownPrice {
  return {
    source: "estimate",
    credits: centsOf(credits),
    from,
    perOutput: true,
  }
}

function scaledBy(price: KnownPrice, ratio: number): KnownPrice {
  return {
    ...price,
    credits: centsOf(price.credits * ratio),
    ...(price.low === undefined ? {} : { low: centsOf(price.low * ratio) }),
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

function timesOf(price: KnownPrice, times: number): KnownPrice {
  return scaledBy(price, times)
}
