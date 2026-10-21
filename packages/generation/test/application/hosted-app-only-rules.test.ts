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

const angles = appDefinition.parse({
  id: "sample-angles",
  nameKey: "name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "inputs.mode",
      options: [
        { value: "angles", labelKey: "mode.angles" },
        { value: "traits", labelKey: "mode.traits" },
      ],
      default: "angles",
      scope: "app",
    },
    {
      type: "choice",
      name: "angleSet",
      labelKey: "inputs.angleSet",
      options: [
        { value: "turnaround", labelKey: "angleSet.turnaround" },
        { value: "heights", labelKey: "angleSet.heights" },
      ],
      default: "turnaround",
      scope: "app",
      when: [{ input: "mode", is: ["angles"] }],
    },
    {
      type: "choice",
      name: "view",
      labelKey: "inputs.view",
      options: [
        { value: "front", labelKey: "view.front" },
        { value: "right", labelKey: "view.right" },
        { value: "low", labelKey: "view.low" },
      ],
      default: "front",
      scope: "app",
      bounds: [
        {
          when: [{ input: "angleSet", is: ["turnaround"] }],
          values: ["front", "right"],
        },
        {
          when: [{ input: "angleSet", is: ["heights"] }],
          values: ["low", "front"],
        },
      ],
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
  const engine = new FakeGenerationEngine({ forms: [hostedForm] })
  const harness = harnessFor({
    apps: [angles],
    engines: [engine],
    policy: new FakeModelPolicy([hostedModel]),
  })
  return harness.start.execute({
    appId: "sample-angles",
    body: { inputs: { model: hostedModel, image: [referenceId], ...inputs } },
    idempotencyKey: null,
    seed: null,
  })
}

describe("a hosted run in an app whose app-only inputs carry rules", () => {
  it("refuses view low when the angle set is turnaround, as the app's bounds do", async () => {
    await expect(
      startWith({ mode: "angles", angleSet: "turnaround", view: "low" })
    ).rejects.toBeInstanceOf(RunInputInvalidError)
  })

  it("refuses an angle set in the traits mode, where the app's when leaves it out", async () => {
    await expect(
      startWith({ mode: "traits", angleSet: "turnaround" })
    ).rejects.toBeInstanceOf(RunInputInvalidError)
  })

  it("control: stores view right when the angle set is turnaround, which its bounds allow", async () => {
    const { run } = await startWith({
      mode: "angles",
      angleSet: "turnaround",
      view: "right",
    })
    expect(run.inputs).toMatchObject({
      mode: "angles",
      angleSet: "turnaround",
      view: "right",
    })
  })
})
