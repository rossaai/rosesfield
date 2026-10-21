import type { ModelField } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  adsCountMaxOf,
  adsHostedInputsOf,
  adsPhotoLimitOf,
} from "#ads/ads-hosted"
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
        count: 1,
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
      count: 1,
    })
    expect(Object.keys(sent).sort()).toEqual(["input_images", "prompt"])
    expect(sent.input_images).toEqual([productOne, productTwo])
    expect(sent.prompt).toContain('"Fresh cold brew')
  })

  it("writes the count into a model's own count field, so a count of 4 asks the model for 4 images", () => {
    const counted: readonly ModelField[] = [
      ...fields,
      {
        kind: "number",
        name: "n",
        path: "n",
        required: false,
        min: 1,
        max: 10,
        integer: true,
        default: 1,
      },
    ]
    const sent = adsHostedInputsOf({
      inputs: ad,
      fields: counted,
      characterPhoto: null,
      aspectRatio: null,
      count: 4,
    })
    expect(sent.n).toBe(4)
  })

  it("control: a model that makes one image at a time gets no count field, since the run repeats the job", () => {
    const single: readonly ModelField[] = [
      ...fields,
      {
        kind: "number",
        name: "n",
        path: "n",
        required: false,
        min: 1,
        max: 1,
        integer: true,
        default: 1,
      },
    ]
    const sent = adsHostedInputsOf({
      inputs: ad,
      fields: single,
      characterPhoto: null,
      aspectRatio: null,
      count: 4,
    })
    expect(sent).not.toHaveProperty("n")
  })

  it("control: a model with no image field gets the prompt alone", () => {
    const textOnly = fields.filter((field) => field.kind !== "media")
    expect(
      adsHostedInputsOf({
        inputs: ad,
        fields: textOnly,
        characterPhoto: portrait,
        aspectRatio: null,
        count: 1,
      })
    ).toEqual({ prompt: adsPromptOf(ad) })
  })

  it("caps the count at the most the model's own count field takes, so a count of 4 asks a model of 2 for 2", () => {
    const twoAtMost: readonly ModelField[] = [
      ...fields,
      {
        kind: "number",
        name: "n",
        path: "n",
        required: false,
        min: 1,
        max: 2,
        integer: true,
        default: 1,
      },
    ]
    const sent = adsHostedInputsOf({
      inputs: ad,
      fields: twoAtMost,
      characterPhoto: null,
      aspectRatio: null,
      count: 4,
    })
    expect(sent.n).toBe(2)
    expect(adsCountMaxOf(twoAtMost, 4)).toBe(2)
  })

  it("control: a model that makes one image at a time takes the app's whole count, since the run repeats the job", () => {
    expect(adsCountMaxOf(fields, 4)).toBe(4)
  })
})

describe("the photo limit of a hosted image edit model", () => {
  const masked: readonly ModelField[] = [
    {
      kind: "media",
      name: "images",
      path: "images",
      required: true,
      media: "image",
      min: 1,
      max: 1,
    },
    {
      kind: "media",
      name: "region",
      path: "edit.mask",
      required: false,
      media: "image",
      min: 0,
      max: 4,
    },
  ]

  it("is the most of the field the photos are sent to, and never a mask, even when the mask's name says nothing of it", () => {
    expect(adsPhotoLimitOf(masked)).toBe(1)
    const sent = adsHostedInputsOf({
      inputs: { product: [productOne] },
      fields: masked,
      characterPhoto: null,
      aspectRatio: null,
      count: 1,
    })
    expect(Object.keys(sent)).toEqual(["images"])
  })

  it("is the widest of the fields that take photos", () => {
    expect(adsPhotoLimitOf(fields)).toBe(10)
  })

  it("control: a model with no field for photos takes none", () => {
    expect(
      adsPhotoLimitOf(fields.filter((field) => field.kind !== "media"))
    ).toBe(0)
  })
})
