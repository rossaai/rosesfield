import { appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { defaultsOf, type FormValues } from "@/screens/app/app-form"
import { withScenes } from "@/studio/storyboard/storyboard-form"
import {
  chosenModelOf,
  formatFieldOf,
  inputsForModel,
  keyframeBody,
  keyframesCredits,
  storyboardBody,
} from "@/studio/storyboard/storyboard-model"
import { app } from "../../../../../packages/catalog/src/storyboard/app"
import { fluxImage, qwenEdit } from "./storyboard-screen"

const listing = appListing.parse(app)

function threeScenes(): FormValues {
  return withScenes(
    { ...defaultsOf(listing), inputs: { ...defaultsOf(listing).inputs } },
    ["the door", "the stairs", "the roof"]
  )
}

describe("the Storyboard model", () => {
  it("opens on the catalog's default when the form holds no catalog model, and keeps a model you chose", () => {
    const models = [qwenEdit, fluxImage]
    expect(chosenModelOf(models, "", qwenEdit.id)?.id).toBe(qwenEdit.id)
    expect(chosenModelOf(models, "flux-2-klein-4b", qwenEdit.id)?.id).toBe(
      qwenEdit.id
    )
    expect(chosenModelOf(models, fluxImage.id, qwenEdit.id)?.id).toBe(
      fluxImage.id
    )
    expect(chosenModelOf([], "", qwenEdit.id)).toBeNull()
  })

  it("reads the format choices from the chosen model's schema", () => {
    expect(formatFieldOf(fluxImage.form ?? [])?.options).toEqual([
      "1:1",
      "16:9",
      "21:9",
    ])
  })

  it("keeps the scenes, the reference and the look when you pick a model, and takes its format default", () => {
    const values = threeScenes()
    const inputs = inputsForModel(
      { ...values.inputs, reference: ["r"], look: "fog" },
      fluxImage
    )
    expect(inputs).toMatchObject({
      scene1: "the door",
      scene3: "the roof",
      reference: ["r"],
      look: "fog",
      model: fluxImage.id,
      aspectRatio: "1:1",
    })
    expect(inputs.prompt).toBeUndefined()
    expect(inputs.images).toBeUndefined()
  })
})

describe("the Storyboard run body", () => {
  it("sends a hosted model's format in its inputs, one keyframe per scene and no app format", () => {
    const values = threeScenes()
    const body = storyboardBody(
      listing,
      { ...values, inputs: inputsForModel(values.inputs, fluxImage) },
      fluxImage
    )
    expect(body.inputs).toMatchObject({
      model: fluxImage.id,
      aspectRatio: "1:1",
      scene1: "the door",
      scene2: "the stairs",
      scene3: "the roof",
      sceneCount: "3",
    })
    expect(body.count).toBe(3)
    expect(body.aspectRatio).toBeUndefined()
  })

  it("sends a graph's format as the app format", () => {
    const body = storyboardBody(listing, threeScenes(), qwenEdit)
    expect(body.inputs.model).toBe(qwenEdit.id)
    expect(body.aspectRatio).toBe("16:9")
    expect(body.count).toBe(3)
  })

  it("prices one keyframe from the first scene alone", () => {
    const body = keyframeBody(listing, threeScenes(), qwenEdit)
    expect(body.count).toBe(1)
    expect(body.inputs).toMatchObject({ sceneCount: "1", scene1: "the door" })
    expect(body.inputs.scene2).toBe("")
  })
})

describe("the Storyboard price", () => {
  it("is one keyframe's price times the scene count", () => {
    expect(keyframesCredits({ source: "rates", credits: 14.48 }, 8)).toBe(
      115.84
    )
    expect(keyframesCredits({ source: "measured", credits: 0.5 }, 3)).toBe(1.5)
  })

  it("is unknown for a model with no price, and never 0", () => {
    expect(keyframesCredits({ source: "unknown", credits: null }, 3)).toBeNull()
    expect(keyframesCredits({ source: "rates", credits: 0 }, 3)).toBeNull()
    expect(keyframesCredits(undefined, 3)).toBeNull()
  })
})
