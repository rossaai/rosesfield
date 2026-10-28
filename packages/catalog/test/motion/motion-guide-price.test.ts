import type { AppDefinition, Cost } from "@rosesfield/contract"
import {
  AppCatalog,
  ComfyGenerationEngine,
  type MeasuredPrice,
  PriceBook,
  type PricedRun,
  PriceRunHandler,
  pricedRunOf,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { graphModel, guideModel } from "#motion/motion-models"
import { both, motion } from "./motion-replay"

class KeptPrices extends PriceBook {
  readonly kept: MeasuredPrice[] = []

  override async find(run: PricedRun): Promise<Cost | null> {
    const found = this.kept.find(
      (one) => one.model === run.model && one.settings === run.settings
    )
    return found?.cost ?? null
  }

  override async keep(price: MeasuredPrice): Promise<void> {
    this.kept.push(price)
  }

  override runsOf(model: string): ReturnType<PriceBook["runsOf"]> {
    return Promise.resolve(
      this.kept
        .filter((one) => one.model === model)
        .map((one) => ({ settings: one.settings, cost: one.cost }))
    )
  }
}

class MotionOnly extends AppCatalog {
  override find(appId: string): AppDefinition | null {
    return appId === motion.id ? motion : null
  }
}

const settings = { ...both, resolution: "480p", sound: "off" }

function handlerWith(prices: KeptPrices): PriceRunHandler {
  return new PriceRunHandler({
    apps: new MotionOnly(),
    engines: [new ComfyGenerationEngine({ apiKey: "comfyui-test" })],
    prices,
  })
}

async function priceOf(handler: PriceRunHandler, model: string) {
  const { price } = await handler.execute({
    appId: motion.id,
    inputs: { ...settings, model },
    aspectRatio: "9:16",
  })
  return price
}

describe("the price Generate shows for Follow a guide", () => {
  it("is the Motion graph's measured run at the same settings, named an estimate, until the guide graph has a run of its own", async () => {
    const prices = new KeptPrices()
    const run = pricedRunOf({
      app: motion,
      inputs: { ...settings, model: graphModel },
      form: null,
      count: 1,
      aspectRatio: "9:16",
    })
    await prices.keep({
      ...run,
      cost: { amount: 0.05, currency: "USD" },
      measuredAt: new Date("2026-10-28T00:00:00Z"),
    })
    const handler = handlerWith(prices)
    const measured = await priceOf(handler, graphModel)
    expect(measured).toMatchObject({ source: "measured" })
    expect(await priceOf(handler, guideModel)).toEqual({
      source: "estimate",
      credits: measured.credits,
      from: "task-runs",
      perOutput: true,
    })
  })

  it("is unknown with no measured run of either graph, the control", async () => {
    expect(await priceOf(handlerWith(new KeptPrices()), guideModel)).toEqual({
      source: "unknown",
      credits: null,
    })
  })
})
