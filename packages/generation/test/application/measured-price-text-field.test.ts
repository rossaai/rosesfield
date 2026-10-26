import { runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { ModelForm } from "#domain/model-form"
import { pricedRunOf } from "#domain/priced-run"
import { taskBinding } from "#domain/task-binding"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeModelPolicy } from "../fake/fake-model-policy"
import { FakePriceBook } from "../fake/fake-price-book"
import { fakeBinding, imageApp, pngBytes } from "../sample"
import { harnessFor } from "./harness"

const form: ModelForm = {
  model: "bfl/flux-3-image",
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    {
      kind: "text",
      name: "resolution",
      path: "resolution",
      required: false,
      maxLength: null,
      default: "1k",
    },
    {
      kind: "text",
      name: "negative_prompt",
      path: "negative_prompt",
      required: false,
      maxLength: null,
      default: null,
    },
    {
      kind: "choice",
      name: "seedance_version",
      path: "seedance_version",
      required: false,
      options: ["1.0", "2.0"],
      default: "1.0",
    },
    {
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["1:1", "16:9"],
      default: "1:1",
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

function keyOf(inputs: Record<string, string>) {
  return pricedRunOf({
    app,
    inputs: { model: form.model, prompt: "a door", ...inputs },
    form,
    count: 1,
    aspectRatio: null,
  })
}

function harnessWith(charged: number) {
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
    steps: [
      { state: "succeeded", cost: { amount: charged / 211, currency: "USD" } },
    ],
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

describe("a measured price is kept per model and setting", () => {
  it("keys two resolutions held in a text field apart", () => {
    expect(keyOf({ resolution: "4k", aspectRatio: "1:1" })).not.toEqual(
      keyOf({ resolution: "1k", aspectRatio: "1:1" })
    )
  })

  it("keys two values of a choice apart", () => {
    expect(keyOf({ resolution: "1k", aspectRatio: "16:9" })).not.toEqual(
      keyOf({ resolution: "1k", aspectRatio: "1:1" })
    )
  })

  it("keys two runs that differ only in their negative prompt together, and holds none of its text", () => {
    const blurry = keyOf({ negative_prompt: "blurry hands" })
    expect(blurry).toEqual(keyOf({ negative_prompt: "a dark sky" }))
    expect(blurry.settings).not.toContain("blurry")
    expect(blurry.settings).not.toContain("negative_prompt")
  })

  it("keys a setting whose name holds seed but is not the seed", () => {
    expect(keyOf({ seedance_version: "2.0" })).not.toEqual(
      keyOf({ seedance_version: "1.0" })
    )
  })

  it("leaves the prompt out of the key", () => {
    expect(keyOf({ prompt: "a window" })).toEqual(keyOf({ prompt: "a door" }))
  })

  it("gives no measured price at 4k after a run at 1k, and scales the rate the 1k run disproved into an estimate", async () => {
    const { harness, prices } = harnessWith(14.48)
    await runOnce(harness, { prompt: "a door", resolution: "1k" })
    expect(prices.kept).toHaveLength(1)
    expect(
      await priceOf(harness, { prompt: "a door", resolution: "4k" })
    ).toEqual({ price: { source: "estimate", credits: 14.48 } })
  })

  it("keeps the rate at other settings while the measured run agrees with it", async () => {
    const { harness } = harnessWith(0.59)
    await runOnce(harness, { prompt: "a door", resolution: "1k" })
    expect(
      await priceOf(harness, { prompt: "a door", resolution: "4k" })
    ).toEqual({ price: { source: "rates", credits: 0.57 } })
  })

  it("replaces a rate the first real run shows too low with the measured price", async () => {
    const { harness } = harnessWith(37.72)
    expect(await priceOf(harness, { prompt: "a fox" })).toEqual({
      price: { source: "rates", credits: 0.57 },
    })
    await runOnce(harness, { prompt: "a fox" })
    expect(await priceOf(harness, { prompt: "another fox" })).toEqual({
      price: {
        source: "measured",
        credits: 37.72,
        from: "measured",
        perOutput: true,
      },
    })
  })
})
