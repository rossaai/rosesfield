import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import {
  clipRangeOf,
  graphRestOf,
  heldWellsOf,
  inputsForModel,
  modelForTab,
  modelsOfTab,
  restFieldsOf,
  tabOfHash,
  tabOfTask,
  wellNamesOf,
} from "@/studio/motion/motion-tabs"
import {
  catalog,
  graph,
  graphId,
  motionListing,
  mover,
  swapGraph,
  swapGraphId,
  swapper,
} from "./motion-fixtures"

const listing = motionListing()

describe("Motion's tabs", () => {
  it("lists each model on the tab of its task: the LTX 2.3 control graph and a mover on Move, the swap graph and a swapper on Swap", () => {
    expect(tabOfTask(graph)).toBe("move")
    expect(tabOfTask(mover)).toBe("move")
    expect(tabOfTask(swapGraph)).toBe("swap")
    expect(tabOfTask(swapper)).toBe("swap")
    expect(modelsOfTab(catalog, "move").map((one) => one.id)).toEqual([
      graphId,
      mover.id,
    ])
    expect(modelsOfTab(catalog, "swap").map((one) => one.id)).toEqual([
      swapGraphId,
      swapper.id,
    ])
  })

  it("lists a model on one tab only, so no technique shows as a second row of the same model, the control", () => {
    const both = [
      ...modelsOfTab(catalog, "move"),
      ...modelsOfTab(catalog, "swap"),
    ]
    expect(both.map((one) => one.id).sort()).toEqual(
      catalog.map((one) => one.id).sort()
    )
  })

  it("keeps a Router model whose schema is not read yet on the tab of its task", () => {
    const unread = { ...swapper, id: "lab/swap-v2", form: null }
    expect(tabOfTask(unread)).toBe("swap")
    expect(modelsOfTab([graph, unread], "move").map((one) => one.id)).toEqual([
      graphId,
    ])
  })

  it("keeps the chosen model on a tab that serves it, and takes the tab's first model otherwise", () => {
    const swap = modelsOfTab(catalog, "swap")
    expect(modelForTab(swap, [mover.id, graphId])?.id).toBe(swapGraphId)
    expect(modelForTab(swap, [swapper.id, graphId])?.id).toBe(swapper.id)
    expect(modelForTab([], [graphId])).toBeNull()
  })

  it("opens Swap from the old Recast address and Move from any other", () => {
    expect(tabOfHash("swap")).toBe("swap")
    expect(tabOfHash("#swap")).toBe("swap")
    expect(tabOfHash("")).toBe("move")
  })
})

describe("the stretch of your video each model takes", () => {
  it("is the stretch each Motion graph keeps, which trims a longer video: 10 seconds on Move and 5 on Swap", () => {
    expect(clipRangeOf(graph)).toEqual({ min: 2, max: 10, trims: true })
    expect(clipRangeOf(swapGraph)).toEqual({ min: 2, max: 5, trims: true })
    expect(clipRangeOf(null, "ltx-2-5-guide")).toEqual({
      min: 2,
      max: 10,
      trims: true,
    })
  })

  it("is the length a hosted model's schema declares, which it refuses past, and none when it declares none, the control", () => {
    expect(clipRangeOf(mover)).toEqual({ min: 3, max: 8, trims: false })
    expect(clipRangeOf(swapper)).toBeNull()
    expect(clipRangeOf(null)).toBeNull()
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
      swapGraph,
      hosted,
      "swap",
      heldWellsOf(hosted, wellNamesOf(listing, mover))
    )
    expect(back).toMatchObject({
      clip: ["clip-5s"],
      photo: ["photo-1"],
      model: swapGraphId,
      mode: "swap",
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

describe("Motion's own wells", () => {
  it("are your video and your photos, never an input a run chain fills, though the chain's first frame and guide come first in the app", () => {
    const motion = findCatalogApp("motion")
    if (motion === null) {
      throw new Error("Motion is not in the catalog")
    }
    const names = motion.inputs.map((input) => input.name)
    expect(names.indexOf("firstFrame")).toBeLessThan(names.indexOf("photo"))
    expect(wellNamesOf(motion, null)).toEqual({ clip: "clip", photo: "photo" })
    const rest = graphRestOf(motion).map((input) => input.name)
    for (const chained of ["firstFrame", "guide", "plannedScene", "frames"]) {
      expect(rest).not.toContain(chained)
    }
  })
})
