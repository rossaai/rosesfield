import { run as runSchema } from "@rosesfield/contract"
import { runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type { ModelForm } from "#domain/model-form"
import { selectBinding } from "#domain/select-binding"
import { taskBinding } from "#domain/task-binding"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { fakeBinding, imageApp, pngBytes, referenceId } from "../sample"
import { harnessFor } from "./harness"

const hostedForm: ModelForm = {
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
      kind: "media",
      name: "images",
      path: "images",
      required: false,
      media: "image",
      min: 1,
      max: 4,
    },
    {
      kind: "number",
      name: "seed",
      path: "seed",
      required: false,
      min: 0,
      max: 100,
      integer: true,
      default: null,
    },
  ],
}

const taskApp = imageApp(
  taskBinding({
    tasks: ["text-to-image"],
    input: "model",
    default: "open",
    fallback: fakeBinding,
  })
)

function harnessWithHosted() {
  const engine = new FakeGenerationEngine({
    key: "fake-engine",
    forms: [hostedForm],
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
    steps: [{ state: "succeeded", cost: { amount: 0.1, currency: "USD" } }],
  })
  return { engine, harness: harnessFor({ apps: [taskApp], engines: [engine] }) }
}

function startHosted(
  harness: ReturnType<typeof harnessFor>,
  inputs: Record<string, unknown>
) {
  return harness.start.execute({
    appId: "sample-image",
    body: { inputs: { model: "maker/picture-2", ...inputs } },
    idempotencyKey: null,
    seed: null,
  })
}

describe("a run of a hosted model", () => {
  it("takes the inputs of the model's form instead of the app's", async () => {
    const { harness } = harnessWithHosted()
    const { run } = await startHosted(harness, {
      prompt: "a red door",
      seed: 4,
    })
    expect(runSchema.parse(run)).toEqual(run)
    expect(run).toMatchObject({
      inputs: { model: "maker/picture-2", prompt: "a red door", seed: 4 },
      count: 1,
      aspectRatio: null,
      seed: 4,
    })
  })

  it("refuses an input the model's form does not take", async () => {
    const { harness } = harnessWithHosted()
    await expect(
      startHosted(harness, { prompt: "a door", references: [referenceId] })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    await expect(
      harness.start.execute({
        appId: "sample-image",
        body: {
          inputs: { model: "maker/picture-2", prompt: "a" },
          count: 3,
        },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
  })

  it("refuses a hosted model no engine describes", async () => {
    const { harness } = harnessWithHosted()
    await expect(
      harness.start.execute({
        appId: "sample-image",
        body: { inputs: { model: "maker/unknown", prompt: "a" } },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toMatchObject({ code: "MODEL_NOT_FOUND", status: 404 })
  })

  it("keeps the app's own inputs for a graph of the same app", async () => {
    const { harness } = harnessWithHosted()
    const { run } = await harness.start.execute({
      appId: "sample-image",
      body: { inputs: { prompt: "a door", model: "open" } },
      idempotencyKey: null,
      seed: null,
    })
    expect(run.inputs).toMatchObject({ model: "open", references: [] })
    expect(run.aspectRatio).toBe("1:1")
  })

  it("sends the model's media inputs as files and keeps the run's cost", async () => {
    const { engine, harness } = harnessWithHosted()
    harness.assets.addFile({
      assetId: referenceId,
      kind: "image",
      mime: "image/png",
      bytes: pngBytes(),
    })
    const { run } = await startHosted(harness, {
      prompt: "a door",
      images: [referenceId],
    })
    const runId = runIdFormat.parse(run.id)
    await harness.advance.execute({ runId })
    expect(engine.submitted[0]?.files.map((file) => file.assetId)).toEqual([
      referenceId,
    ])
    expect(engine.submitted[0]?.binding).toEqual({
      adapter: "hosted-model",
      config: { model: "maker/picture-2" },
    })
    await harness.advance.execute({ runId })
    const done = (await harness.get.execute({ runId })).run
    expect(done.status).toBe("done")
    expect(done.cost).toEqual({ amount: 0.1, currency: "USD" })
  })

  it("starts a graph whose binding reads an input the app fills with its default", async () => {
    const byModel = selectBinding({
      input: "model",
      options: {
        open: selectBinding({
          input: "quality",
          options: { draft: fakeBinding },
        }),
        hosted: fakeBinding,
      },
    })
    const graphApp = imageApp(
      taskBinding({
        tasks: ["text-to-image"],
        input: "model",
        default: "open",
        fallback: byModel,
      })
    )
    const withQuality = {
      ...graphApp,
      inputs: [
        ...graphApp.inputs,
        {
          type: "choice" as const,
          name: "quality",
          labelKey: "inputs.quality",
          options: [
            { value: "draft", labelKey: "quality.draft" },
            { value: "final", labelKey: "quality.final" },
          ],
          default: "draft",
        },
      ],
    }
    const harness = harnessFor({ apps: [withQuality] })
    const { run } = await harness.start.execute({
      appId: "sample-image",
      body: { inputs: { prompt: "a door" } },
      idempotencyKey: null,
      seed: null,
    })
    expect(run.inputs).toMatchObject({ model: "open", quality: "draft" })
  })
})
