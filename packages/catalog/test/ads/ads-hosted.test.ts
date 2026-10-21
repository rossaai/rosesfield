import type { ModelField } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { adsHostedInputsOf } from "#ads/ads-hosted"
import { adsPromptOf } from "#ads/ads-prompt"

const productOne = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
const productTwo = "5e3d2c1b-0a9f-4b7c-9d6e-4f3a2b1c0d9e"
const portrait = "6f4e3d2c-1b0a-4c8d-8e7f-5a4b3c2d1e0f"
const character = "7a5f4e3d-2c1b-4d9e-9f8a-6b5c4d3e2f1a"

const fields: readonly ModelField[] = [
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: true,
    maxLength: 2000,
    default: null,
  },
  {
    kind: "media",
    name: "mask",
    path: "mask",
    required: false,
    media: "image",
    min: 0,
    max: 1,
  },
  {
    kind: "media",
    name: "input_images",
    path: "input_images",
    required: true,
    media: "image",
    min: 1,
    max: 10,
  },
  {
    kind: "choice",
    name: "aspect_ratio",
    path: "aspect_ratio",
    required: false,
    options: ["1:1", "4:5", "16:9"],
    default: "1:1",
  },
]

const ad = {
  kind: "ad",
  headline: "Fresh cold brew",
  line: "Made in small batches",
  style: "bold",
  product: [productOne],
  secondPhoto: [productTwo],
  character: [character],
}

describe("the fields Ads fills on a hosted image edit model", () => {
  it("sends the prompt Ads builds, the product photos then the character's photo, and the format", () => {
    expect(
      adsHostedInputsOf({
        inputs: ad,
        fields,
        characterPhoto: portrait,
        aspectRatio: "4:5",
      })
    ).toEqual({
      prompt: adsPromptOf(ad),
      input_images: [productOne, productTwo, portrait],
      aspect_ratio: "4:5",
    })
  })

  it("sends no Ads input under its own name and leaves out a format the model lacks", () => {
    const sent = adsHostedInputsOf({
      inputs: ad,
      fields,
      characterPhoto: null,
      aspectRatio: "21:9",
    })
    expect(Object.keys(sent).sort()).toEqual(["input_images", "prompt"])
    expect(sent.input_images).toEqual([productOne, productTwo])
    expect(sent.prompt).toContain('"Fresh cold brew')
  })

  it("control: a model with no image field gets the prompt alone", () => {
    const textOnly = fields.filter((field) => field.kind !== "media")
    expect(
      adsHostedInputsOf({
        inputs: ad,
        fields: textOnly,
        characterPhoto: portrait,
        aspectRatio: null,
      })
    ).toEqual({ prompt: adsPromptOf(ad) })
  })
})
