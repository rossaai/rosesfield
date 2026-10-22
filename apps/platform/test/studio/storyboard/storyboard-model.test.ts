import { appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { defaultsOf, type FormValues } from "@/screens/app/app-form"
import { withScenes } from "@/studio/storyboard/storyboard-form"
import {
  callsCredits,
  chosenModelOf,
  editModelsOf,
  formatFieldOf,
  inputsForModel,
  type Price,
  priceAsksOf,
  storyboardAskOf,
} from "@/studio/storyboard/storyboard-model"
import { app } from "../../../../../packages/catalog/src/storyboard/app"
import { fluxImage, qwenEdit, zImage } from "./storyboard-screen"

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

describe("the Storyboard ask", () => {
  it("sends a hosted model's format in its own settings, the scenes in the app inputs and no app format", () => {
    const values = threeScenes()
    const ask = storyboardAskOf({
      app: listing,
      values: { ...values, inputs: inputsForModel(values.inputs, fluxImage) },
      chosen: fluxImage,
      photos: [],
    })
    expect(ask?.inputs).toMatchObject({
      model: fluxImage.id,
      scene1: "the door",
      scene2: "the stairs",
      scene3: "the roof",
      sceneCount: "3",
    })
    expect(ask?.inputs).not.toHaveProperty("aspectRatio")
    expect(ask?.hosted?.settings).toEqual({
      aspectRatio: "1:1",
      resolution: "1k",
    })
    expect(ask?.aspectRatio).toBeNull()
  })

  it("sends a graph's format as the app format and holds no hosted settings", () => {
    const ask = storyboardAskOf({
      app: listing,
      values: threeScenes(),
      chosen: qwenEdit,
      photos: [],
    })
    expect(ask?.inputs.model).toBe(qwenEdit.id)
    expect(ask?.aspectRatio).toBe("16:9")
    expect(ask?.hosted).toBeNull()
  })

  it("holds no ask when an input names an asset with no asset id, so no run starts on it", () => {
    const values = threeScenes()
    const ask = storyboardAskOf({
      app: listing,
      values: { ...values, inputs: { ...values.inputs, reference: ["photo"] } },
      chosen: qwenEdit,
      photos: [],
    })
    expect(ask).toBeNull()
  })
})

describe("the Storyboard price", () => {
  function asksOf(values: FormValues) {
    return priceAsksOf(
      storyboardAskOf({ app: listing, values, chosen: qwenEdit, photos: [] })
    )
  }

  it("prices one text call and two edits of keyframe 1 for 3 scenes with no anchor", () => {
    const asks = asksOf(threeScenes())
    expect(asks.text?.inputs).toMatchObject({
      model: "z-image-turbo",
      keyframe: "1",
    })
    expect(asks.edit?.inputs).toMatchObject({
      model: qwenEdit.id,
      keyframe: "2",
    })
    expect(asks.edits).toBe(2)
  })

  it("prices 3 edits and no text call for 3 scenes from a reference", () => {
    const values = threeScenes()
    const asks = asksOf({
      ...values,
      inputs: {
        ...values.inputs,
        reference: ["1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e"],
      },
    })
    expect(asks.text).toBeNull()
    expect(asks.edit?.inputs).toMatchObject({ keyframe: "1" })
    expect(asks.edits).toBe(3)
  })

  it("is the sum of its calls, one keyframe times the scene count when every call costs the same", () => {
    const keyframe: Price = { source: "rates", credits: 14.48 }
    expect(
      callsCredits([
        { price: keyframe, calls: 1 },
        { price: keyframe, calls: 7 },
      ])
    ).toBe(115.84)
    expect(
      callsCredits([
        { price: { source: "measured", credits: 0.25 }, calls: 1 },
        { price: { source: "measured", credits: 0.5 }, calls: 2 },
      ])
    ).toBe(1.25)
    expect(
      callsCredits([
        { price: undefined, calls: 0 },
        { price: keyframe, calls: 3 },
      ])
    ).toBe(43.44)
  })

  it("is unknown when any call has no price, and never 0", () => {
    const keyframe: Price = { source: "rates", credits: 14.48 }
    expect(
      callsCredits([
        { price: { source: "unknown", credits: null }, calls: 1 },
        { price: keyframe, calls: 2 },
      ])
    ).toBeNull()
    expect(
      callsCredits([{ price: { source: "rates", credits: 0 }, calls: 3 }])
    ).toBeNull()
    expect(callsCredits([{ price: undefined, calls: 3 }])).toBeNull()
    expect(callsCredits([])).toBeNull()
  })
})

describe("the Storyboard menu", () => {
  it("lists the edit models and leaves out the text default keyframe 1 runs on", () => {
    expect(editModelsOf([qwenEdit, zImage, fluxImage])).toEqual([
      qwenEdit,
      fluxImage,
    ])
  })
})
