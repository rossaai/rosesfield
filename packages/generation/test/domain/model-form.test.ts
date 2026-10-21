import { describe, expect, it } from "vitest"
import { checkModelInputs, type ModelForm } from "#domain/model-form"
import { referenceId } from "../sample"

const form: ModelForm = {
  model: "maker/model",
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: 20,
      default: null,
    },
    {
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["1:1", "16:9"],
      default: "1:1",
    },
    {
      kind: "number",
      name: "duration",
      path: "duration",
      required: false,
      min: 2,
      max: 10,
      integer: true,
      default: 5,
    },
    {
      kind: "toggle",
      name: "generateAudio",
      path: "generate_audio",
      required: false,
      default: false,
    },
    {
      kind: "media",
      name: "images",
      path: "images",
      required: false,
      media: "image",
      min: 1,
      max: 2,
    },
  ],
}

describe("checkModelInputs", () => {
  it("keeps the values the form takes and adds the model", () => {
    const checked = checkModelInputs(form, {
      prompt: "a door",
      aspectRatio: "16:9",
      duration: 6,
      generateAudio: "on",
      images: [referenceId],
    })
    expect(checked).toEqual({
      kind: "valid",
      inputs: {
        model: "maker/model",
        prompt: "a door",
        aspectRatio: "16:9",
        duration: 6,
        generateAudio: "on",
        images: [referenceId],
      },
    })
  })

  it("names each value the form refuses", () => {
    const checked = checkModelInputs(form, {
      prompt: "x".repeat(21),
      aspectRatio: "4:3",
      duration: 5.5,
      generateAudio: true,
      images: [referenceId, referenceId, referenceId],
      style: "film",
    })
    expect(checked.kind).toBe("invalid")
    const issues = checked.kind === "invalid" ? checked.issues : []
    expect(issues.map((issue) => issue.split(":")[0])).toEqual([
      "style",
      "prompt",
      "aspectRatio",
      "duration",
      "generateAudio",
      "images",
    ])
  })

  it("needs a required field", () => {
    expect(checkModelInputs(form, {})).toEqual({
      kind: "invalid",
      issues: ["prompt: the model needs it"],
    })
  })

  it("refuses a number outside the schema's bounds", () => {
    const low = checkModelInputs(form, { prompt: "a", duration: 1 })
    const high = checkModelInputs(form, { prompt: "a", duration: 11 })
    expect(low.kind).toBe("invalid")
    expect(high.kind).toBe("invalid")
  })

  it("refuses a number off the field's step and keeps one on it", () => {
    const stepped: ModelForm = {
      model: "maker/model",
      fields: [
        {
          kind: "number",
          name: "frames",
          path: "frames",
          required: true,
          min: 9,
          max: 121,
          integer: true,
          step: 8,
          default: null,
        },
      ],
    }
    expect(checkModelInputs(stepped, { frames: 24 }).kind).toBe("valid")
    expect(checkModelInputs(stepped, { frames: 25 })).toEqual({
      kind: "invalid",
      issues: ["frames: the value moves in steps of 8"],
    })
  })
})
