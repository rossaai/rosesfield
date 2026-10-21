import { appDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { pricedRunOf } from "#domain/priced-run"
import { taskBinding } from "#domain/task-binding"
import { fakeBinding } from "../sample"

const app = appDefinition.parse({
  id: "sample-modes",
  nameKey: "name",
  category: "image",
  inputs: [
    {
      type: "choice",
      name: "mode",
      labelKey: "inputs.mode",
      options: [
        { value: "portrait", labelKey: "mode.portrait" },
        { value: "views", labelKey: "mode.views" },
      ],
      default: "portrait",
    },
    {
      type: "choice",
      name: "model",
      labelKey: "inputs.model",
      options: [
        { value: "open-portrait", labelKey: "model.portrait" },
        { value: "open-views", labelKey: "model.views" },
      ],
      default: "open-portrait",
      bounds: [
        {
          when: [{ input: "mode", is: ["portrait"] }],
          values: ["open-portrait"],
        },
        { when: [{ input: "mode", is: ["views"] }], values: ["open-views"] },
      ],
    },
  ],
  output: {
    kind: "image",
    count: { default: 1, max: 4 },
    aspectRatios: { options: ["1:1"], default: "1:1" },
  },
  engine: taskBinding({
    tasks: ["text-to-image", "image-edit"],
    input: "model",
    default: "open-portrait",
    fallback: fakeBinding,
  }),
  limits: { timeoutSeconds: 600, maxRetries: 0 },
})

function keyOf(inputs: Record<string, string>) {
  return pricedRunOf({ app, inputs, form: null, count: 1, aspectRatio: null })
}

describe("the measured price key of a mode that bounds its model", () => {
  it("keys a body with no model on the graph its mode runs, the one the run start stores", () => {
    expect(keyOf({ mode: "views" }).model).toBe("open-views")
    expect(keyOf({ mode: "views" })).toEqual(
      keyOf({ mode: "views", model: "open-views" })
    )
  })

  it("control: keys the two modes apart, so one mode's measured cost never prices the other", () => {
    expect(keyOf({ mode: "views" })).not.toEqual(keyOf({ mode: "portrait" }))
    expect(keyOf({}).model).toBe("open-portrait")
  })
})
