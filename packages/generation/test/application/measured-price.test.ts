import { runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeModelPolicy } from "../fake/fake-model-policy"
import { FakePriceBook } from "../fake/fake-price-book"
import { fakeBinding, imageApp, pngBytes } from "../sample"
import { harnessFor } from "./harness"

const form: ModelForm = {
  model: "maker/picture-2",
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: 500,
      default: null,
    },
    {
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["1:1", "16:9"],
      default: "16:9",
    },
  ],
}

const app = imageApp(
  taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: "open",
    fallback: fakeBinding,
  })
)

function harnessWith(cost: { amount: number; currency: "USD" } | null) {
  const prices = new FakePriceBook()
  const engine = new FakeGenerationEngine({
    forms: [form],
    creditsPerUsd: 211,
    price: { source: "rates", credits: 0.57 },
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
    steps: [{ state: "succeeded", cost }],
  })
  const harness = harnessFor({
    apps: [app],
    engines: [engine],
    policy: new FakeModelPolicy([form.model]),
    prices,
  })
  return { harness, prices }
}

async function runOnce(
  harness: ReturnType<typeof harnessFor>,
  inputs: Record<string, string>
) {
  const { run } = await harness.start.execute({
    appId: "sample-image",
    body: { inputs: { model: form.model, ...inputs } },
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

function priceOf(
  harness: ReturnType<typeof harnessFor>,
  inputs: Record<string, string>
) {
  return harness.price.execute({
    appId: "sample-image",
    inputs: { model: form.model, ...inputs },
  })
}

describe("the measured price of a model at its settings", () => {
  it("prices the next run at the same settings from the last run's real credits, and holds the rate it disproved to it elsewhere", async () => {
    const { harness, prices } = harnessWith({
      amount: 1.188768 / 211,
      currency: "USD",
    })
    expect(await priceOf(harness, { prompt: "a door" })).toEqual({
      price: { source: "rates", credits: 0.57 },
    })
    await runOnce(harness, { prompt: "a door" })
    expect(prices.kept).toHaveLength(1)
    expect(
      await priceOf(harness, { prompt: "a window", aspectRatio: "16:9" })
    ).toEqual({
      price: {
        source: "measured",
        credits: 1.19,
        from: "measured",
        perOutput: true,
      },
    })
    expect(
      await priceOf(harness, { prompt: "a door", aspectRatio: "1:1" })
    ).toEqual({ price: { source: "estimate", credits: 1.19 } })
  })

  it("keeps no price for a run whose real credits were not measured", async () => {
    const { harness, prices } = harnessWith(null)
    await runOnce(harness, { prompt: "a door" })
    expect(prices.kept).toEqual([])
    expect(await priceOf(harness, { prompt: "a door" })).toEqual({
      price: { source: "rates", credits: 0.57 },
    })
  })
})
