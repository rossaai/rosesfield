import { appDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { RunInputInvalidError } from "#domain/error/run-input-invalid.error"
import type { ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeModelPolicy } from "../fake/fake-model-policy"
import { fakeBinding, referenceId } from "../sample"
import { harnessFor } from "./harness"

const hostedModel = "maker/picture-edit"

const hostedForm: ModelForm = {
  model: hostedModel,
  fields: [
    {
      kind: "media",
      name: "image",
      path: "image",
      required: true,
      media: "image",
      min: 1,
      max: 1,
    },
  ],
}

const modeApp = appDefinition.parse({
  id: "sample-layers",
  nameKey: "name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "inputs.mode",
      options: [
        { value: "split", labelKey: "mode.split" },
        { value: "edit", labelKey: "mode.edit" },
      ],
      default: "split",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [
        { value: "open-split", labelKey: "model.split" },
        { value: "open-edit", labelKey: "model.edit" },
      ],
      default: "open-split",
      bounds: [
        { when: [{ input: "mode", is: ["split"] }], values: ["open-split"] },
        { when: [{ input: "mode", is: ["edit"] }], values: ["open-edit"] },
      ],
    },
    {
      type: "choice",
      name: "quality",
      labelKey: "inputs.quality",
      options: [
        { value: "draft", labelKey: "quality.draft" },
        { value: "final", labelKey: "quality.final" },
      ],
      default: "draft",
    },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 1 },
    aspectRatios: { options: ["1:1"], default: "1:1" },
  },
  engine: taskBinding({
    tasks: ["image-edit"],
    input: "model",
    default: "open-split",
    fallback: fakeBinding,
  }),
  limits: { timeoutSeconds: 600, maxRetries: 0 },
})

function startWith(inputs: Record<string, unknown>) {
  const harness = harnessFor({
    apps: [modeApp],
    engines: [new FakeGenerationEngine({ forms: [hostedForm] })],
    policy: new FakeModelPolicy([hostedModel]),
  })
  return harness.start.execute({
    appId: "sample-layers",
    body: { inputs: { model: hostedModel, image: [referenceId], ...inputs } },
    idempotencyKey: null,
    seed: null,
  })
}

describe("a hosted run in an app whose mode bounds its model", () => {
  it("keeps the mode it was started in beside the model's own inputs", async () => {
    const { run } = await startWith({ mode: "edit" })
    expect(run.inputs).toEqual({
      model: hostedModel,
      image: [referenceId],
      mode: "edit",
    })
  })

  it("refuses a mode the app does not offer", async () => {
    await expect(startWith({ mode: "fill" })).rejects.toBeInstanceOf(
      RunInputInvalidError
    )
  })

  it("control: still refuses an app input that does not bound the model", async () => {
    await expect(startWith({ quality: "final" })).rejects.toBeInstanceOf(
      RunInputInvalidError
    )
  })
})
