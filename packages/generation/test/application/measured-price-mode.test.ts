import { describe, expect, it } from "vitest"
import { pricedRunOf } from "#domain/priced-run"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakePriceBook } from "../fake/fake-price-book"
import { modesApp, start } from "../sample"
import { harnessFor } from "./harness"

const viewsCost = { amount: 0.1, currency: "USD" } as const

function harnessWithViewsCost() {
  const prices = new FakePriceBook()
  prices.kept.push({
    ...pricedRunOf({
      app: modesApp,
      inputs: { mode: "views", model: "open-views" },
      form: null,
      count: 1,
      aspectRatio: null,
    }),
    cost: viewsCost,
    measuredAt: start,
  })
  const engine = new FakeGenerationEngine({
    creditsPerUsd: 211,
    price: { source: "rates", credits: 0.57 },
  })
  return harnessFor({ apps: [modesApp], engines: [engine], prices })
}

describe("the price of a mode that bounds its model", () => {
  it("prices a body with no model on the graph its mode runs, from the cost the run start keyed", async () => {
    const harness = harnessWithViewsCost()
    expect(
      await harness.price.execute({
        appId: "sample-modes",
        inputs: { mode: "views" },
      })
    ).toEqual({
      price: { source: "measured", credits: 21.1, from: "measured" },
    })
  })

  it("control: prices the other mode at its rate, since no cost is kept for it", async () => {
    const harness = harnessWithViewsCost()
    expect(
      await harness.price.execute({
        appId: "sample-modes",
        inputs: { mode: "portrait" },
      })
    ).toEqual({ price: { source: "rates", credits: 0.57 } })
  })
})
