import { appDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { chooserInputsOf } from "#domain/model-choosers"
import type { ModelField, ModelForm } from "#domain/model-form"
import { taskBinding } from "#domain/task-binding"
import { fakeBinding } from "../sample"

const image: ModelField = {
  kind: "media",
  name: "image",
  path: "image",
  required: true,
  media: "image",
  min: 1,
  max: 1,
}

const form: ModelForm = { model: "maker/picture-edit", fields: [image] }

function appWith(engine: unknown) {
  return appDefinition.parse({
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
        type: "character",
        name: "character",
        labelKey: "inputs.character",
        presence: "required",
        max: 1,
        when: [{ input: "mode", is: ["edit"] }],
      },
      {
        type: "choice",
        name: "side",
        labelKey: "inputs.side",
        options: [
          { value: "front", labelKey: "side.front" },
          { value: "back", labelKey: "side.back" },
        ],
        default: "front",
        when: [{ input: "mode", is: ["edit"] }],
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
    engine,
    limits: { timeoutSeconds: 600, maxRetries: 0 },
  })
}

const modeApp = appWith(
  taskBinding({
    tasks: ["image-edit"],
    input: "model",
    default: "open-split",
    fallback: fakeBinding,
  })
)

const ada = "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d"

const given = {
  mode: "edit",
  model: "maker/picture-edit",
  quality: "final",
  image: ["0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"],
}

describe("the app inputs that bound a hosted model's choice", () => {
  it("keeps the input a bound of the model input names, and leaves the rest to the model", () => {
    const { mode, ...rest } = given
    expect(chooserInputsOf(modeApp, given, form)).toEqual({
      inputs: { mode },
      rest,
      issues: [],
    })
  })

  it("refuses a value that is not one of the app's choices, and keeps it out of both", () => {
    const { mode: _, ...rest } = given
    expect(chooserInputsOf(modeApp, { ...given, mode: "erase" }, form)).toEqual(
      {
        inputs: {},
        rest,
        issues: ["mode: the value is not one of the app's choices"],
      }
    )
  })

  it("leaves an input the model's own form takes to the model", () => {
    const owned: ModelForm = {
      ...form,
      fields: [image, { ...image, name: "mode" }],
    }
    const chosen = chooserInputsOf(modeApp, given, owned)
    expect(chosen.inputs).toEqual({})
    expect(chosen.rest).toEqual(given)
  })

  it("keeps nothing for a bound input that is not given", () => {
    const { mode: _, ...rest } = given
    expect(chooserInputsOf(modeApp, rest, form)).toEqual({
      inputs: {},
      rest,
      issues: [],
    })
  })

  it("keeps a character and a choice the bounding mode shows, and leaves them out of the model's inputs", () => {
    const shown = { ...given, character: [ada], side: "back" }
    const { mode, character, side, ...rest } = shown
    expect(chooserInputsOf(modeApp, shown, form)).toEqual({
      inputs: { mode, character, side },
      rest,
      issues: [],
    })
  })

  it("refuses a character the given mode hides, and one list longer than the app takes", () => {
    const hidden = chooserInputsOf(
      modeApp,
      { ...given, mode: "split", character: [ada] },
      form
    )
    expect(hidden.inputs).toEqual({ mode: "split" })
    expect(hidden.rest).not.toHaveProperty("character")
    expect(hidden.issues).toEqual([
      "character applies only when mode is edit",
    ])
    const two = chooserInputsOf(
      modeApp,
      { ...given, character: [ada, ada], side: "left" },
      form
    )
    expect(two.inputs).toEqual({ mode: "edit" })
    expect(two.issues).toEqual([
      "character: 1 to 1 saved characters",
      "side: the value is not one of the app's choices",
    ])
  })

  it("control: an app whose engine names no model input keeps nothing", () => {
    expect(chooserInputsOf(appWith(fakeBinding), given, form)).toEqual({
      inputs: {},
      rest: given,
      issues: [],
    })
  })
})
