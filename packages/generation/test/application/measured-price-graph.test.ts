import type { EngineBinding } from "@rosesfield/contract"
import { runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { unknownPrice } from "#domain/generation-engine.port"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakePriceBook } from "../fake/fake-price-book"
import { imageApp, pngBytes } from "../sample"
import { type Harness, harnessFor } from "./harness"

const graphBefore: EngineBinding = {
  adapter: "fake-engine",
  config: { graph: "graph-before" },
}

const graphAfter: EngineBinding = {
  adapter: "fake-engine",
  config: { graph: "graph-after" },
}

const inputs = { prompt: "a door" }

function harnessOn(graph: EngineBinding, prices: FakePriceBook): Harness {
  const engine = new FakeGenerationEngine({
    creditsPerUsd: 211,
    outputs: [
      {
        kind: "image",
        mime: "image/png",
        bytes: pngBytes(),
        width: 2,
        height: 2,
        durationSeconds: null,
      },
    ],
    steps: [{ state: "succeeded", cost: { amount: 0.0159, currency: "USD" } }],
  })
  return harnessFor({ apps: [imageApp(graph)], engines: [engine], prices })
}

async function runOnce(harness: Harness): Promise<void> {
  const { run } = await harness.start.execute({
    appId: "sample-image",
    body: { inputs },
    idempotencyKey: null,
    seed: null,
  })
  const runId = runIdFormat.parse(run.id)
  for (let step = 0; step < 4; step += 1) {
    const { nextWakeMs } = await harness.advance.execute({ runId })
    if (nextWakeMs === null) {
      break
    }
  }
}

async function priceOf(harness: Harness) {
  const { price } = await harness.price.execute({
    appId: "sample-image",
    inputs,
    aspectRatio: "1:1",
  })
  return price
}

describe("the measured price of a graph that changed", () => {
  it("prices the graph that ran from its run, the control", async () => {
    const prices = new FakePriceBook()
    await runOnce(harnessOn(graphBefore, prices))
    expect(prices.kept).toHaveLength(1)
    expect(await priceOf(harnessOn(graphBefore, prices))).toEqual({
      source: "measured",
      credits: 3.35,
      from: "measured",
    })
  })

  it("never prices the graph that replaced it from that run, measured or scaled", async () => {
    const prices = new FakePriceBook()
    await runOnce(harnessOn(graphBefore, prices))
    expect(await priceOf(harnessOn(graphAfter, prices))).toEqual(unknownPrice)
  })
})
