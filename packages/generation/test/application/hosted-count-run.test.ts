import { runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { ModelField, ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeModelPolicy } from "../fake/fake-model-policy"
import { FakePriceBook } from "../fake/fake-price-book"
import { fakeBinding, imageApp, pngBytes } from "../sample"
import { harnessFor } from "./harness"

const model = "maker/picture-2"

const prompt: ModelField = {
  kind: "prompt",
  name: "prompt",
  path: "prompt",
  required: true,
  maxLength: 500,
  default: null,
}

const seed: ModelField = {
  kind: "number",
  name: "seed",
  path: "seed",
  required: false,
  min: 0,
  max: 100,
  integer: true,
  default: null,
}

const oneAtATime: ModelForm = { model, fields: [prompt, seed] }

const severalAtOnce: ModelForm = {
  model,
  fields: [
    prompt,
    {
      kind: "number",
      name: "n",
      path: "n",
      required: false,
      min: 1,
      max: 4,
      integer: true,
      default: 1,
    },
  ],
}

const onlyOne: ModelForm = {
  model,
  fields: [
    prompt,
    {
      kind: "number",
      name: "n",
      path: "n",
      required: false,
      min: 1,
      max: 1,
      integer: true,
      default: 1,
    },
  ],
}

class MeteredAlone extends FakeGenerationEngine {
  override submitsAlone(): boolean {
    return true
  }
}

function harnessWith(form: ModelForm) {
  const prices = new FakePriceBook()
  const engine = new MeteredAlone({
    key: "fake-engine",
    forms: [form],
    refByKey: true,
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
    steps: [{ state: "succeeded", cost: { amount: 1 / 211, currency: "USD" } }],
  })
  const harness = harnessFor({
    apps: [
      imageApp(
        taskBinding({
          tasks: ["text-to-image"],
          input: "model",
          default: "open",
          fallback: fakeBinding,
        })
      ),
    ],
    engines: [engine],
    policy: new FakeModelPolicy([model]),
    prices,
  })
  return { harness, engine, prices }
}

function startWithCount(
  harness: ReturnType<typeof harnessFor>,
  count: number,
  inputs: Record<string, unknown> = {}
) {
  return harness.start.execute({
    appId: "sample-image",
    body: { inputs: { model, prompt: "a lighthouse", ...inputs }, count },
    idempotencyKey: null,
    seed: null,
  })
}

describe("a count of 3 on a model that makes one image at a time", () => {
  it("runs 3 jobs one after another, each with its own key, seed and cost, and keeps 3 outputs", async () => {
    const { harness, engine } = harnessWith(oneAtATime)
    const { run } = await startWithCount(harness, 3, { seed: 7 })
    expect(run.count).toBe(3)
    const runId = runIdFormat.parse(run.id)
    await harness.advance.execute({ runId })
    expect(engine.submitted).toHaveLength(1)
    for (let step = 0; step < 6; step += 1) {
      await harness.advance.execute({ runId })
    }
    expect(engine.submitted.map((one) => one.idempotencyKey)).toEqual([
      `${run.id}-0`,
      `${run.id}-1`,
      `${run.id}-2`,
    ])
    expect(engine.submitted.map((one) => one.inputs.seed)).toEqual([7, 8, 9])
    const done = (await harness.runs.get(runId))?.toRecord()
    expect(done?.status).toBe("done")
    expect(done?.outputs).toHaveLength(3)
    expect(done?.cost?.amount).toBeCloseTo(3 / 211)
  })

  it("prices 3 jobs as 3 times the measured price of one", async () => {
    const { harness } = harnessWith(oneAtATime)
    const { run } = await startWithCount(harness, 1)
    const runId = runIdFormat.parse(run.id)
    for (let step = 0; step < 3; step += 1) {
      await harness.advance.execute({ runId })
    }
    const price = await harness.price.execute({
      appId: "sample-image",
      inputs: { model, prompt: "a lighthouse" },
      count: 3,
    })
    expect(price).toEqual({ price: { source: "measured", credits: 3 } })
  })

  it("runs 3 jobs on a model whose count field takes at most 1", async () => {
    const { harness, engine } = harnessWith(onlyOne)
    const { run } = await startWithCount(harness, 3)
    expect(run.count).toBe(3)
    const runId = runIdFormat.parse(run.id)
    for (let step = 0; step < 7; step += 1) {
      await harness.advance.execute({ runId })
    }
    expect(engine.submitted).toHaveLength(3)
    expect((await harness.runs.get(runId))?.toRecord().outputs).toHaveLength(3)
  })

  it("wraps each job's seed within the form's own seed range", async () => {
    const { harness, engine } = harnessWith(oneAtATime)
    const { run } = await startWithCount(harness, 3, { seed: 100 })
    const runId = runIdFormat.parse(run.id)
    for (let step = 0; step < 7; step += 1) {
      await harness.advance.execute({ runId })
    }
    expect(engine.submitted.map((one) => one.inputs.seed)).toEqual([100, 0, 1])
  })

  it("gives each job its own seed above the run's own seed range when the form allows it", async () => {
    const wide: ModelForm = {
      model,
      fields: [prompt, { ...seed, max: 4_294_967_295 }],
    }
    const { harness, engine } = harnessWith(wide)
    const { run } = await startWithCount(harness, 3, { seed: 3_000_000_000 })
    const runId = runIdFormat.parse(run.id)
    for (let step = 0; step < 7; step += 1) {
      await harness.advance.execute({ runId })
    }
    expect(engine.submitted.map((one) => one.inputs.seed)).toEqual([
      3_000_000_000, 3_000_000_001, 3_000_000_002,
    ])
  })

  it("refuses a count on a model that sets its own count in its inputs", async () => {
    const { harness } = harnessWith(severalAtOnce)
    await expect(startWithCount(harness, 3)).rejects.toMatchObject({
      code: "RUN_INPUT_INVALID",
    })
  })
})
