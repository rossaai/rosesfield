import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import {
  type AppDefinition,
  type AppListing,
  run,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import { bodyOf, defaultsOf, type FieldValue } from "@/screens/app/app-form"
import {
  adsProblems,
  adsValuesOf,
  barTextInputs,
  barTextOf,
  bodyAppFor,
  compactedPhotos,
  formProblemsOf,
  holdsBarText,
  modelPhotoLimitOf,
  optionalApp,
  photoLimitOf,
  photoMaxOf,
  photoRoomOf,
} from "@/studio/ads/ads-rules"

function adsListing(): AppListing {
  const listing = findCatalogApp("ads")
  if (listing === null) {
    throw new Error("The catalog lists no ads app")
  }
  return listing
}

function adsDefinition(): AppDefinition {
  const definition = findApp("ads")
  if (definition === null) {
    throw new Error("The catalog lists no ads app")
  }
  return definition
}

const listing = adsListing()
const contract = startRunBodyFor(adsDefinition())
const photo = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
const otherPhoto = "5e3d2c1b-0a9f-4b7c-9d6e-4f3a2b1c0d9e"
const character = "7a5f4e3d-2c1b-4d9e-9f8a-6b5c4d3e2f1a"

type Inputs = Record<string, FieldValue>

function formInputs(change: Inputs): Inputs {
  return { ...defaultsOf(optionalApp(listing)).inputs, ...change }
}

function keysOf(change: Inputs): string[] {
  return adsProblems(listing, formInputs(change)).map((one) => one.key)
}

function formAccepts(change: Inputs): boolean {
  const values = { ...defaultsOf(listing), inputs: formInputs(change) }
  return formProblemsOf(listing, values).length === 0
}

function contractAccepts(change: Inputs): boolean {
  const inputs = formInputs(change)
  const values = { ...defaultsOf(listing), inputs }
  return contract.safeParse(bodyOf(bodyAppFor(listing, inputs), values)).success
}

const two = { product: [photo], secondPhoto: [otherPhoto] }
const three = { ...two, thirdPhoto: [photo] }

const states: { name: string; change: Inputs }[] = [
  { name: "one photo", change: { product: [photo] } },
  { name: "no photo", change: {} },
  { name: "a scene", change: { product: [photo], scene: "on a desk" } },
  {
    name: "a scene of 501 characters",
    change: { product: [photo], scene: "a".repeat(501) },
  },
  { name: "an ad with no words", change: { product: [photo], kind: "ad" } },
  {
    name: "an ad with two lines",
    change: { product: [photo], kind: "ad", headline: "Fresh", line: "Daily" },
  },
  {
    name: "an ad with a headline of 61 characters",
    change: { product: [photo], kind: "ad", headline: "a".repeat(61) },
  },
  {
    name: "an ad with a line of 121 characters",
    change: {
      product: [photo],
      kind: "ad",
      headline: "Fresh",
      line: "a".repeat(121),
    },
  },
  { name: "3 photos on Qwen", change: three },
  {
    name: "3 photos and a character on Qwen",
    change: { ...three, character: [character] },
  },
  { name: "3 photos on Klein", change: { ...three, model: "flux-2-klein-4b" } },
  {
    name: "2 photos and a character on Klein",
    change: { ...two, character: [character], model: "flux-2-klein-4b" },
  },
  {
    name: "1 photo and a character on Klein",
    change: {
      product: [photo],
      character: [character],
      model: "flux-2-klein-4b",
    },
  },
  {
    name: "an ad after a scene of 600 characters",
    change: {
      product: [photo],
      scene: "a".repeat(600),
      kind: "ad",
      headline: "Fresh",
    },
  },
  {
    name: "a product shot after a headline of 70 characters",
    change: { product: [photo], headline: "a".repeat(70) },
  },
]

describe("the Ads screen rules", () => {
  it.each(states)(
    "start a run with $name only when the contract accepts its body",
    ({ change }) => {
      expect(keysOf(change).length === 0).toBe(contractAccepts(change))
    }
  )

  it.each(states.filter(({ change }) => keysOf(change).length === 0))(
    "let the form start a run with $name, because the screen does",
    ({ change }) => {
      expect(formAccepts(change)).toBe(true)
    }
  )

  it("state in each model's line the photos the contract lets it take", () => {
    const model = listing.inputs.find((input) => input.name === "model")
    const options = model?.type === "choice" ? model.options : []
    expect(options.length).toBe(2)
    for (const option of options) {
      const line = tCatalog(`${option.labelKey}.line`)
      expect(line).toContain(
        `up to ${photoLimitOf(listing, option.value)} photos`
      )
      expect(line).not.toContain("Open weights")
    }
  })

  it("count the photos the tray still takes", () => {
    expect(photoMaxOf(listing)).toBe(3)
    expect(photoRoomOf(listing, formInputs({}))).toBe(3)
    expect(photoRoomOf(listing, formInputs(three))).toBe(0)
    expect(photoRoomOf(listing, formInputs(two))).toBe(1)
  })

  it("name the input each refused state breaks", () => {
    expect(keysOf({})).toEqual(["ads.input.product.required"])
    expect(keysOf({ product: [photo], kind: "ad" })).toEqual([
      "ads.input.headline.required",
    ])
    expect(
      keysOf({ product: [photo], kind: "ad", headline: "a".repeat(61) })
    ).toEqual(["ads.input.headline.long"])
    expect(
      keysOf({ product: [photo], kind: "ad", headline: "a", line: "b\nc" })
    ).toEqual(["ads.input.line.tooManyLines"])
    expect(keysOf({ product: [photo], scene: "a".repeat(501) })).toEqual([
      "ads.input.scene.long",
    ])
    expect(
      adsProblems(listing, formInputs({ ...three, character: [character] }))
    ).toEqual([
      {
        input: "model",
        key: "ads.input.model.tooManyPhotos",
        values: { max: 3 },
        focus: "attach",
      },
    ])
    expect(
      adsProblems(
        listing,
        formInputs({ ...two, character: [character], model: "flux-2-klein-4b" })
      )[0]?.values
    ).toEqual({ max: 2 })
  })

  it("read how many photos each model takes from the contract's rules", () => {
    expect(photoLimitOf(listing, "qwen-image-edit-2511")).toBe(3)
    expect(photoLimitOf(listing, "flux-2-klein-4b")).toBe(2)
  })

  it("split the bar's text into the inputs of each kind and join it back", () => {
    expect(barTextInputs(listing, "product-shot", "on a desk")).toEqual({
      scene: "on a desk",
    })
    expect(barTextInputs(listing, "ad", "Fresh\nMade daily")).toEqual({
      headline: "Fresh",
      line: "Made daily",
    })
    expect(barTextInputs(listing, "ad", "Fresh")).toEqual({
      headline: "Fresh",
      line: "",
    })
    expect(
      barTextOf(listing, { kind: "ad", headline: "Fresh", line: "Daily" })
    ).toBe("Fresh\nDaily")
    expect(
      barTextOf(listing, { kind: "ad", headline: "Fresh", line: "" })
    ).toBe("Fresh")
    expect(
      barTextOf(listing, { kind: "product-shot", scene: "on a desk" })
    ).toBe("on a desk")
  })

  it("keep a line break you just typed while the form holds the same words", () => {
    const inputs = { kind: "ad", headline: "Fresh", line: "" }
    expect(holdsBarText(listing, inputs, "ad", "Fresh\n")).toBe(true)
    expect(holdsBarText(listing, inputs, "ad", "Other")).toBe(false)
  })

  it("move a third photo up when the second is removed", () => {
    expect(
      compactedPhotos(listing, { product: [photo], thirdPhoto: [otherPhoto] })
    ).toEqual({ product: [photo], secondPhoto: [otherPhoto], thirdPhoto: [] })
    expect(compactedPhotos(listing, three)).toBeNull()
  })
})

const twoReferences: CatalogModel = {
  id: "maker/two-references",
  kind: "hosted",
  maker: "Maker",
  name: "Two references",
  nameKey: null,
  task: "image-edit",
  tags: [{ kind: "hosted" }, { kind: "references", max: 2 }],
  form: null,
}

describe("the Ads photo limit of a catalog model", () => {
  it("reads a hosted model's limit from its references, counting the character's photo", () => {
    const inputs = formInputs({
      product: [photo],
      secondPhoto: [otherPhoto],
      character: [character],
      model: twoReferences.id,
    })
    expect(adsProblems(listing, inputs, [twoReferences])).toEqual([
      {
        input: "model",
        key: "ads.input.model.tooManyPhotos",
        values: { max: 2 },
        focus: "attach",
      },
    ])
    expect(
      adsProblems(listing, { ...inputs, character: [] }, [twoReferences])
    ).toEqual([])
    const hosted = modelPhotoLimitOf(listing, twoReferences.id, twoReferences)
    const graph = modelPhotoLimitOf(listing, "qwen-image-edit-2511", undefined)
    expect(hosted).toBe(2)
    expect(graph).toBe(photoLimitOf(listing, "qwen-image-edit-2511"))
  })

  it("leaves a hosted model the catalog has not listed to the gateway", () => {
    const inputs = formInputs({ ...three, model: twoReferences.id })
    expect(adsProblems(listing, inputs, [])).toEqual([])
  })
})

describe("Use these inputs on an Ads run", () => {
  it("fills a hosted model's run with its seed, its words, its photos and its model", () => {
    const made = run.parse({
      id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a02",
      appId: "ads",
      status: "done",
      inputs: {
        kind: "ad",
        headline: "Fresh",
        line: "Made daily",
        product: [photo],
        character: [character],
        style: "bold",
        model: "bfl/flux-3-image",
      },
      count: 4,
      aspectRatio: "4:5",
      seed: 42,
      outputs: [],
      progress: null,
      engine: { adapter: "hosted-model", models: [], workflowHash: null },
      cost: null,
      origin: "live",
      failure: null,
      createdAt: "2026-10-20T09:00:00.000Z",
      finishedAt: "2026-10-20T09:00:20.000Z",
    })
    const values = adsValuesOf(listing, made)
    expect(values.seedMode).toBe("fixed")
    expect(values.inputs.seed).toBe(42)
    expect(values.count).toBe(4)
    expect(values.aspectRatio).toBe("4:5")
    expect(values.inputs).toMatchObject(made.inputs)
  })
})
