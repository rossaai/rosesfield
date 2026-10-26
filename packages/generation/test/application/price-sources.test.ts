import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { PriceRunHandler } from "#application/price-run/price-run.handler"
import type { RunPrice } from "#domain/generation-engine.port"
import { pricedRunOf } from "#domain/priced-run"
import { taskBinding } from "#domain/task-binding"
import { FakeAppCatalog } from "../fake/fake-app-catalog"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakePriceBook } from "../fake/fake-price-book"
import { fakeBinding, start } from "../sample"

const clips: AppDefinition = appDefinition.parse({
  id: "sample-clips",
  nameKey: "name",
  category: "video",
  inputs: [
    {
      type: "prompt",
      name: "prompt",
      labelKey: "inputs.prompt",
      presence: "required",
      maxLength: 500,
    },
    {
      type: "number",
      name: "length",
      labelKey: "inputs.length",
      min: 1,
      max: 20,
      step: 1,
      default: 5,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [
        { value: "clip-a", labelKey: "model.a" },
        { value: "clip-b", labelKey: "model.b" },
        { value: "clip-c", labelKey: "model.c" },
        { value: "still-a", labelKey: "model.still" },
      ],
      default: "clip-a",
    },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 4 },
    aspectRatios: { options: ["16:9"], default: "16:9" },
  },
  engine: taskBinding({
    tasks: ["text-to-video"],
    input: "model",
    default: "clip-a",
    fallback: fakeBinding,
    graphTasks: {
      "clip-a": "text-to-video",
      "clip-b": "text-to-video",
      "clip-c": "text-to-video",
      "still-a": "text-to-image",
    },
  }),
  limits: { timeoutSeconds: 600, maxRetries: 0 },
})

type Ask = { model: string; length: number; count?: number }

function keep(book: FakePriceBook, ask: Ask, credits: number): void {
  const run = pricedRunOf({
    app: clips,
    inputs: { prompt: "a wave", model: ask.model, length: ask.length },
    form: null,
    count: ask.count ?? 1,
    aspectRatio: null,
  })
  void book.keep({
    ...run,
    cost: { amount: credits / 211, currency: "USD" },
    measuredAt: start,
  })
}

function keepWithoutSeconds(
  book: FakePriceBook,
  model: string,
  credits: number
): void {
  const run = pricedRunOf({
    app: clips,
    inputs: { prompt: "a wave", model, length: 5 },
    form: null,
    count: 1,
    aspectRatio: null,
  })
  const settings = JSON.stringify(
    (JSON.parse(run.settings) as [string, unknown][]).filter(
      ([name]) => name !== "length"
    )
  )
  void book.keep({
    ...run,
    settings,
    cost: { amount: credits / 211, currency: "USD" },
    measuredAt: start,
  })
}

function handlerWith(options: {
  book: FakePriceBook
  quote?: RunPrice
  engines?: FakeGenerationEngine[]
}): PriceRunHandler {
  const engine = new FakeGenerationEngine({
    creditsPerUsd: 211,
    ...(options.quote === undefined ? {} : { price: options.quote }),
  })
  return new PriceRunHandler({
    apps: new FakeAppCatalog([clips]),
    engines: options.engines ?? [engine],
    prices: options.book,
  })
}

async function priceOf(handler: PriceRunHandler, ask: Ask): Promise<RunPrice> {
  const { price } = await handler.execute({
    appId: clips.id,
    inputs: { prompt: "a wave", model: ask.model, length: ask.length },
    count: ask.count ?? 1,
  })
  return price
}

describe("the order of the sources that price a run", () => {
  it("answers from a measured run at the same settings before the engine's quote", async () => {
    const book = new FakePriceBook()
    keep(book, { model: "clip-a", length: 5 }, 10)
    const handler = handlerWith({
      book,
      quote: { source: "rates", credits: 3 },
    })
    expect(await priceOf(handler, { model: "clip-a", length: 5 })).toEqual({
      source: "measured",
      credits: 10,
      from: "measured",
    })
  })

  it("answers from the engine's quote when no run at those settings is measured", async () => {
    const book = new FakePriceBook()
    keep(book, { model: "clip-a", length: 5 }, 10)
    const handler = handlerWith({
      book,
      quote: { source: "rates", credits: 3, from: "rate-card" },
    })
    expect(await priceOf(handler, { model: "clip-a", length: 10 })).toEqual({
      source: "rates",
      credits: 3,
      from: "rate-card",
    })
  })

  it("reads a measured run when the engine that would run it holds no credits, as the demo engine does", async () => {
    const book = new FakePriceBook()
    keep(book, { model: "clip-a", length: 5 }, 10)
    const handler = handlerWith({
      book,
      engines: [
        new FakeGenerationEngine({ origin: "demo" }),
        new FakeGenerationEngine({ creditsPerUsd: 211 }),
      ],
    })
    expect(await priceOf(handler, { model: "clip-a", length: 5 })).toEqual({
      source: "measured",
      credits: 10,
      from: "measured",
    })
  })
})

describe("the price of a graph no engine quotes", () => {
  it("scales the nearest measured run of the same graph by its outputs and its seconds", async () => {
    const book = new FakePriceBook()
    keep(book, { model: "clip-a", length: 5 }, 10)
    const handler = handlerWith({ book })
    expect(
      await priceOf(handler, { model: "clip-a", length: 10, count: 2 })
    ).toEqual({
      source: "estimate",
      credits: 40,
      from: "model-runs",
      perOutput: true,
    })
  })

  it("takes the median of the measured runs of the graphs that run the same task, scaled the same way", async () => {
    const book = new FakePriceBook()
    keep(book, { model: "clip-b", length: 5 }, 6)
    keep(book, { model: "clip-c", length: 5 }, 12)
    keep(book, { model: "still-a", length: 5 }, 100)
    const handler = handlerWith({ book })
    expect(await priceOf(handler, { model: "clip-a", length: 10 })).toEqual({
      source: "estimate",
      credits: 18,
      from: "task-runs",
      perOutput: true,
    })
  })

  it("skips a measured run that names no seconds and falls to the runs of the same task", async () => {
    const book = new FakePriceBook()
    keepWithoutSeconds(book, "clip-a", 10)
    keep(book, { model: "clip-b", length: 5 }, 6)
    const handler = handlerWith({ book })
    expect(await priceOf(handler, { model: "clip-a", length: 20 })).toEqual({
      source: "estimate",
      credits: 24,
      from: "task-runs",
      perOutput: true,
    })
  })

  it("stays unknown when no graph of its task has a measured run", async () => {
    const book = new FakePriceBook()
    keep(book, { model: "still-a", length: 5 }, 100)
    const handler = handlerWith({ book })
    expect(await priceOf(handler, { model: "clip-a", length: 5 })).toEqual({
      source: "unknown",
      credits: null,
    })
  })
})
