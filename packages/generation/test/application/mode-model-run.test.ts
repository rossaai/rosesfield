import { appDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { FakeModelPolicy } from "../fake/fake-model-policy"
import { fakeBinding, referenceId } from "../sample"
import { harnessFor } from "./harness"

const hostedModel = "maker/clip-edit"

const openModel = "open-extend"

const hostedForm: ModelForm = {
  model: hostedModel,
  fields: [
    {
      kind: "media",
      name: "source",
      path: "video",
      required: true,
      media: "video",
      min: 1,
      max: 1,
    },
  ],
}

const modeApp = appDefinition.parse({
  id: "sample-modes",
  nameKey: "name",
  category: "video",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "inputs.mode",
      options: [
        { value: "edit", labelKey: "mode.edit" },
        { value: "extend", labelKey: "mode.extend" },
      ],
      default: "edit",
    },
    {
      type: "video",
      name: "source",
      labelKey: "inputs.source",
      presence: "required",
      max: 1,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [
        { value: hostedModel, labelKey: "model.hosted" },
        { value: openModel, labelKey: "model.open" },
      ],
      default: hostedModel,
      bounds: [
        { when: [{ input: "mode", is: ["edit"] }], values: [hostedModel] },
        { when: [{ input: "mode", is: ["extend"] }], values: [openModel] },
      ],
    },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: ["16:9"], default: "16:9" },
  },
  engine: taskBinding({
    tasks: ["video-edit"],
    input: "model",
    default: hostedModel,
    fallback: fakeBinding,
  }),
  limits: { timeoutSeconds: 600, maxRetries: 0 },
})

function harness() {
  return harnessFor({
    apps: [modeApp],
    engines: [new FakeGenerationEngine({ forms: [hostedForm] })],
    policy: new FakeModelPolicy([hostedModel]),
  })
}

function startWith(inputs: Record<string, unknown>) {
  return harness().start.execute({
    appId: "sample-modes",
    body: { inputs: { source: [referenceId], ...inputs } },
    idempotencyKey: null,
    seed: null,
  })
}

describe("a run whose model the app's per-mode rules choose", () => {
  it("runs the graph a mode's rule picks when the run names no model, instead of the hosted default", async () => {
    const { run } = await startWith({ mode: "extend" })
    expect(run.engine.adapter).toBe("fake-engine")
    expect(run.inputs).toMatchObject({ mode: "extend", model: openModel })
  })

  it("still runs the hosted model the default mode's rule picks", async () => {
    const { run } = await startWith({})
    expect(run.inputs).toMatchObject({ model: hostedModel })
    expect(run.inputs).not.toHaveProperty("mode")
  })
})
