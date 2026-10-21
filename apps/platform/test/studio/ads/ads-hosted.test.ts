import { findApp } from "@rosesfield/catalog"
import { adsPromptOf } from "@rosesfield/catalog/ads"
import type { ModelField } from "@rosesfield/catalog/comfy"
import {
  type AppDefinition,
  appOnlyInputsFor,
  isAppOnly,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { defaultsOf, type FieldValue } from "@/screens/app/app-form"
import { hostedBody } from "@/screens/app/hosted/hosted-form"
import { adsHostedBodyOf, countAppOf } from "@/studio/ads/ads-hosted"
import { optionalApp } from "@/studio/ads/ads-rules"

const listing = (() => {
  const found = findCatalogApp("ads")
  if (found === null) {
    throw new Error("The catalog lists no ads app")
  }
  return found
})()

function adsDefinition(): AppDefinition {
  const definition = findApp("ads")
  if (definition === null) {
    throw new Error("The catalog lists no ads app")
  }
  return definition
}

const photo = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
const otherPhoto = "5e3d2c1b-0a9f-4b7c-9d6e-4f3a2b1c0d9e"
const character = "7a5f4e3d-2c1b-4d9e-9f8a-6b5c4d3e2f1a"

function formInputs(change: Record<string, FieldValue>) {
  return { ...defaultsOf(optionalApp(listing)).inputs, ...change }
}

const fluxFields: readonly ModelField[] = [
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
    options: ["1:1", "4:5"],
    default: "1:1",
  },
  {
    kind: "choice",
    name: "output_format",
    path: "output_format",
    required: true,
    options: ["png", "jpeg"],
    default: "png",
  },
]

describe("the body Ads sends a hosted model", () => {
  const portrait = "6f4e3d2c-1b0a-4c8d-8e7f-5a4b3c2d1e0f"
  const inputs = formInputs({
    kind: "ad",
    headline: "Fresh",
    line: "Made daily",
    scene: "a desk left from a product shot",
    style: "bold",
    product: [photo],
    secondPhoto: [otherPhoto],
    character: [character],
    model: "bfl/flux-3-image",
  })
  const values = {
    ...defaultsOf(listing),
    inputs,
    count: 4,
    aspectRatio: "4:5",
  }
  const own = hostedBody("bfl/flux-3-image", fluxFields, values, "image")
  const body = adsHostedBodyOf(listing, values, fluxFields, portrait, own)
  const appOnly = new Set(
    adsDefinition()
      .inputs.filter(isAppOnly)
      .map((input) => input.name)
  )

  it("fills the model's prompt with the words Ads builds, its images with the photos and the character's photo, and its format", () => {
    expect(body.inputs).toMatchObject({
      model: "bfl/flux-3-image",
      prompt: adsPromptOf(inputs),
      input_images: [photo, otherPhoto, portrait],
      aspect_ratio: "4:5",
      output_format: "png",
    })
    expect(body.count).toBe(4)
  })

  it("keeps the shown words, photos, character, kind and style as the inputs the run stores, and no scene of the other kind", () => {
    const kept = Object.fromEntries(
      Object.entries(body.inputs).filter(([name]) => appOnly.has(name))
    )
    expect(kept).toEqual({
      kind: "ad",
      headline: "Fresh",
      line: "Made daily",
      style: "bold",
      product: [photo],
      secondPhoto: [otherPhoto],
      character: [character],
    })
    expect(appOnlyInputsFor(adsDefinition()).safeParse(kept).success).toBe(true)
  })

  it("sends the model no field it lacks, beside the inputs the run stores", () => {
    const fieldNames = new Set(["model", ...fluxFields.map((one) => one.name)])
    expect(
      Object.keys(body.inputs).filter(
        (name) => !appOnly.has(name) && !fieldNames.has(name)
      )
    ).toEqual([])
  })

  it("asks a model that sets its own count, such as GPT Image 2, for the count shown, so 4 is priced and made as 4 images", () => {
    const counted: readonly ModelField[] = [
      ...fluxFields,
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
    const ownOfCounted = hostedBody(
      "openai/gpt-image-2",
      counted,
      values,
      "image"
    )
    const counts = adsHostedBodyOf(
      listing,
      values,
      counted,
      portrait,
      ownOfCounted
    )
    expect(counts.inputs.n).toBe(4)
    expect(counts.count).toBeUndefined()
  })
})

describe("the count Ads shows for a model", () => {
  const twoAtMost: ModelField = {
    kind: "number",
    name: "n",
    path: "n",
    required: false,
    min: 1,
    max: 2,
    integer: true,
    default: 1,
  }

  it("is at most what the model's own count field takes", () => {
    const shown = countAppOf(listing, [...fluxFields, twoAtMost])
    expect(shown.output.count.max).toBe(2)
    expect(shown.output.count.default).toBeLessThanOrEqual(2)
  })

  it("control: stays the app's own count for a graph model and for a model that makes one image at a time", () => {
    expect(countAppOf(listing, null)).toBe(listing)
    expect(countAppOf(listing, fluxFields)).toBe(listing)
  })
})
