import { appDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { appOnlyInputsOf } from "#domain/app-only-inputs"
import { fakeBinding } from "../sample"

function appWith(scope: { scope: "app" } | Record<string, never>) {
  return appDefinition.parse({
    id: "sample-scenes",
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
        ...scope,
      },
      {
        type: "prompt",
        name: "scene",
        labelKey: "inputs.scene",
        presence: "required",
        maxLength: 20,
        ...scope,
      },
      {
        type: "choice",
        name: "quality",
        labelKey: "inputs.quality",
        options: [{ value: "draft", labelKey: "quality.draft" }],
        default: "draft",
      },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["1:1"], default: "1:1" },
    },
    engine: fakeBinding,
    limits: { timeoutSeconds: 600, maxRetries: 0 },
  })
}

const given = {
  mode: "edit",
  scene: "a fox at dusk",
  quality: "draft",
  prompt: "a fox",
}

describe("the inputs an app keeps for itself", () => {
  it("keeps each app-only input and leaves every other name to the model", () => {
    expect(appOnlyInputsOf(appWith({ scope: "app" }), given)).toEqual({
      inputs: { mode: "edit", scene: "a fox at dusk" },
      rest: { quality: "draft", prompt: "a fox" },
      issues: [],
    })
  })

  it("refuses an app-only value the app's own definition refuses, and keeps nothing", () => {
    const refused = appOnlyInputsOf(appWith({ scope: "app" }), {
      ...given,
      mode: "fill",
      scene: "a fox at dusk, then the fox in snow",
    })
    expect(refused.inputs).toEqual({})
    expect(refused.rest).toEqual({ quality: "draft", prompt: "a fox" })
    expect(refused.issues.map((issue) => issue.split(":")[0])).toEqual([
      "mode",
      "scene",
    ])
  })

  it("keeps nothing for an app-only input that is not given", () => {
    expect(
      appOnlyInputsOf(appWith({ scope: "app" }), { prompt: "a fox" })
    ).toEqual({ inputs: {}, rest: { prompt: "a fox" }, issues: [] })
  })

  it("control: an app that marks no input app-only keeps nothing", () => {
    expect(appOnlyInputsOf(appWith({}), given)).toEqual({
      inputs: {},
      rest: given,
      issues: [],
    })
  })
})
