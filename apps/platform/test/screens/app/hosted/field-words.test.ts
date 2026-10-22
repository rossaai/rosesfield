import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { wordsOfPath } from "@/screens/app/hosted/field-words"
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

  it("names a nested media field by its parent alone, with no repeated url", () => {
    expect(wordsOfPath("image_url.url")).toBe("Image")
    expect(
      wordsOfPath(
        "content.[].{type=image_url}.{role=first_frame}.image_url.url"
      )
    ).toBe("Image")
    expect(wordsOfPath("instances.0.lastFrame.bytesBase64Encoded")).toBe(
      "Last frame"
    )
    expect(wordsOfPath("image_url")).toBe("Image url")
  })

  it("names the first frame, the last frame and the references from the copy file", () => {
    const media = (name: string, path: string): ModelField => ({
      kind: "media",
      name,
      path,
      required: false,
      media: "image",
      min: 1,
      max: 1,
    })
    expect(
      fieldCaption(
        media(
          "firstFrame",
          "content.[].{type=image_url}.{role=first_frame}.image_url.url"
        )
      )
    ).toBe("First frame")
    expect(
      fieldCaption(
        media(
          "lastFrame",
          "content.[].{type=image_url}.{role=last_frame}.image_url.url"
        )
      )
    ).toBe("Last frame")
    expect(
      fieldCaption(
        media(
          "references",
          "content.[].{type=image_url}.{role=reference_image}.image_url.url"
        )
      )
    ).toBe("Reference images")
  })
})
