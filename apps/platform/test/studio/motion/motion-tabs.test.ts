import { describe, expect, it } from "vitest"
import {
  clipRangeOf,
  graphClipRange,
  graphRestOf,
  heldWellsOf,
  inputsForModel,
  modelForTab,
  modelsOfMode,
  modelsOfTab,
  restFieldsOf,
  tabOfHash,
  tabOfModel,
  tabsOfModel,
  wellNamesOf,
} from "@/studio/motion/motion-tabs"
import {
  catalog,
  graph,
  graphId,
  guide,
  motionListing,
  mover,
  swapper,
} from "./motion-fixtures"

const listing = motionListing()

describe("Motion's tabs", () => {
  it("lists the graph on both tabs and each Router model on the tab of its task", () => {
    expect(tabsOfModel(graph)).toEqual(["move", "swap"])
    expect(tabsOfModel(mover)).toEqual(["move"])
    expect(tabsOfModel(swapper)).toEqual(["swap"])
    expect(modelsOfTab(catalog, "move").map((one) => one.id)).toEqual([
      graphId,
      mover.id,
    ])
    expect(modelsOfTab(catalog, "swap").map((one) => one.id)).toEqual([
      graphId,
      swapper.id,
    ])
  })

  it("keeps a Router model whose schema is not read yet on the tab of its task, with its own wells", () => {
    const unread = { ...swapper, id: "lab/swap-v2", form: null }
    expect(tabsOfModel(unread)).toEqual(["swap"])
    expect(modelsOfTab([graph, unread], "move").map((one) => one.id)).toEqual([
      graphId,
    ])
    expect(clipRangeOf(listing, unread)).not.toEqual(graphClipRange)
  })

  it("keeps the chosen model on a tab that serves it, and moves a model to the tab of its task", () => {
    const swap = modelsOfTab(catalog, "swap")
    expect(modelForTab(swap, [mover.id, graphId])?.id).toBe(graphId)
    expect(modelForTab(swap, [swapper.id, graphId])?.id).toBe(swapper.id)
    expect(tabOfModel(mover, "swap")).toBe("move")
    expect(tabOfModel(graph, "swap")).toBe("swap")
  })

  it("opens Swap a character from the old Recast address and Move a photo from any other", () => {
    expect(tabOfHash("swap")).toBe("swap")
    expect(tabOfHash("#swap")).toBe("swap")
    expect(tabOfHash("")).toBe("move")
  })
})

describe("Follow a guide", () => {
  it("is the one tab of the depth guide graph, which no other mode lists", () => {
    expect(tabsOfModel(guide)).toEqual(["guide"])
    expect(tabOfModel(guide, "move")).toBe("guide")
    expect(tabOfModel(graph, "guide")).toBe("move")
    expect(modelsOfMode(catalog, "guide")).toEqual([guide])
    expect(modelsOfMode(catalog, "clip").map((one) => one.id)).toEqual([
      graphId,
      mover.id,
      swapper.id,
    ])
    expect(modelsOfTab(catalog, "move").map((one) => one.id)).not.toContain(
      guide.id
    )
  })

  it("keeps the photo and the video in the same wells, and leaves the clip's sound out", () => {
    expect(wellNamesOf(listing, guide)).toEqual({
      clip: "clip",
      photo: "photo",
    })
    expect(clipRangeOf(listing, guide)).toEqual(graphClipRange)
    expect(graphRestOf(listing, "guide")).toEqual([])
  })

  it("records the clip's sound as off on a guide run, because the guide graph writes no sound", () => {
    const wells = { clip: ["guide-1"], photo: ["photo-1"] }
    const kept = { sound: "on" }
    expect(inputsForModel(listing, guide, kept, "guide", wells)).toMatchObject({
      sound: "off",
      model: guide.id,
      mode: "guide",
      clip: ["guide-1"],
    })
    expect(inputsForModel(listing, graph, kept, "move", wells)).toMatchObject({
      sound: "on",
    })
  })
})

describe("Motion's wells for each model", () => {
  it("names the app's wells for the graph and the schema's media fields for a Router model", () => {
    expect(wellNamesOf(listing, graph)).toEqual({
      clip: "clip",
      photo: "photo",
    })
    expect(wellNamesOf(listing, mover)).toEqual({
      clip: "referenceVideo",
      photo: "characterImage",
    })
  })

  it("takes the length limit the schema declares, and the graph's own otherwise", () => {
    expect(clipRangeOf(listing, graph)).toEqual(graphClipRange)
    expect(clipRangeOf(listing, mover)).toEqual({ min: 3, max: 8 })
    expect(clipRangeOf(listing, swapper)).toBeNull()
  })

  it("moves the clip and the photo into the next model's wells and keeps the typed prompt", () => {
    const wells = heldWellsOf(
      { clip: ["clip-5s"], photo: ["photo-1"] },
      wellNamesOf(listing, graph)
    )
    const hosted = inputsForModel(
      listing,
      mover,
      { prompt: "a street at night", sound: "on" },
      "move",
      wells
    )
    expect(hosted).toMatchObject({
      referenceVideo: ["clip-5s"],
      characterImage: ["photo-1"],
      prompt: "a street at night",
      duration: 5,
      model: mover.id,
      mode: "move",
    })
    const back = inputsForModel(
      listing,
      graph,
      hosted,
      "swap",
      heldWellsOf(hosted, wellNamesOf(listing, mover))
    )
    expect(back).toMatchObject({
      clip: ["clip-5s"],
      photo: ["photo-1"],
      model: graphId,
      mode: "swap",
      sound: "on",
    })
  })

  it("shows a Router model's other fields and leaves its two wells out", () => {
    expect(restFieldsOf(mover).map((field) => field.name)).toEqual([
      "duration",
      "prompt",
    ])
    expect(restFieldsOf(graph)).toEqual([])
    expect(graphRestOf(listing).map((input) => input.name)).toEqual(["sound"])
  })
})
