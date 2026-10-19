import { describe, expect, it } from "vitest"
import { fieldCaption } from "@/screens/app/hosted/hosted-fields"

describe("the caption of a hosted model's field", () => {
  it("comes from the copy file for a field the copy names", () => {
    expect(
      fieldCaption({
        kind: "toggle",
        name: "generateAudio",
        path: "generate_audio",
        required: false,
        default: null,
      })
    ).toBe("Sound")
  })

  it("names an unknown field by its path, with its parent when the last word says little", () => {
    expect(
      fieldCaption({
        kind: "number",
        name: "imageRefWeight",
        path: "image_ref.0.weight",
        required: false,
        min: 0,
        max: 1,
        integer: false,
        default: null,
      })
    ).toBe("Image ref weight")
    expect(
      fieldCaption({
        kind: "text",
        name: "lightDirection",
        path: "light_direction",
        required: false,
        maxLength: null,
        default: null,
      })
    ).toBe("Light direction")
  })
})
