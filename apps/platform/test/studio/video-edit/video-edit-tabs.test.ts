import { appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  clipFieldOf,
  modelForTab,
  modelsOfTab,
  openingTabOf,
  tabDefaultsOf,
  tabOfRun,
  tabsOf,
} from "@/studio/video-edit/video-edit-tabs"
import {
  bria,
  briaId,
  catalog,
  dreamina,
  dreaminaId,
  fiveTabs,
  fluxContinue,
  fluxContinueId,
  fluxEdit,
  fluxEditId,
  graphs,
  ids,
} from "./video-edit-catalog"

describe("Video edit's tabs", () => {
  it("shows the five operations the app declares, in their order, each with its own label", () => {
    expect(tabsOf(fiveTabs)).toEqual([
      { mode: "edit", labelKey: "videoEdit.choice.mode.edit" },
      { mode: "extend", labelKey: "videoEdit.choice.mode.extend" },
      { mode: "reframe", labelKey: "videoEdit.choice.mode.reframe" },
      { mode: "background", labelKey: "videoEdit.choice.mode.background" },
      { mode: "frame-rate", labelKey: "videoEdit.choice.mode.frameRate" },
    ])
  })

  it("shows only the operations the app declares, and opens on its default one", () => {
    const fourTabs = appListing.parse({
      ...fiveTabs,
      inputs: fiveTabs.inputs.map((input) =>
        input.name === "mode" && input.type === "choice"
          ? {
              ...input,
              options: input.options.filter((one) => one.value !== "edit"),
              default: "extend",
            }
          : input
      ),
    })
    expect(tabsOf(fourTabs).map((tab) => tab.mode)).toEqual([
      "extend",
      "reframe",
      "background",
      "frame-rate",
    ])
    expect(openingTabOf(fiveTabs)).toBe("edit")
    expect(openingTabOf(fourTabs)).toBe("extend")
  })
})

describe("the models of a tab", () => {
  it("lists every video edit model of the catalog in Edit and no graph", () => {
    expect(ids(modelsOfTab(catalog, fiveTabs, "edit"))).toEqual([
      dreaminaId,
      fluxContinueId,
      fluxEditId,
    ])
  })

  it("lists the graph each other tab declares, and the background models in Background", () => {
    expect(ids(modelsOfTab(catalog, fiveTabs, "extend"))).toEqual([
      graphs.extend.id,
      fluxContinueId,
    ])
    expect(ids(modelsOfTab(catalog, fiveTabs, "reframe"))).toEqual([
      graphs.reframe.id,
    ])
    expect(ids(modelsOfTab(catalog, fiveTabs, "background"))).toEqual([
      graphs.background.id,
      briaId,
    ])
    expect(ids(modelsOfTab(catalog, fiveTabs, "frame-rate"))).toEqual([
      graphs.frameRate.id,
    ])
  })

  it("opens Edit on Dreamina Seedance 2.5 with FLUX Video Edit one choice away", () => {
    const edit = modelsOfTab(catalog, fiveTabs, "edit")
    const chosen = modelForTab(
      edit,
      null,
      tabDefaultsOf(fiveTabs, "edit", dreaminaId)
    )
    expect(chosen).toBe(dreaminaId)
    expect(ids(edit)).toContain(fluxEditId)
  })

  it("opens each other tab on the graph it declares, and keeps the model you picked in a tab", () => {
    const extend = modelsOfTab(catalog, fiveTabs, "extend")
    expect(
      modelForTab(extend, null, tabDefaultsOf(fiveTabs, "extend", dreaminaId))
    ).toBe(graphs.extend.id)
    expect(
      modelForTab(
        extend,
        fluxContinueId,
        tabDefaultsOf(fiveTabs, "extend", dreaminaId)
      )
    ).toBe(fluxContinueId)
    const hostedFirst = modelsOfTab(
      [fluxContinue, graphs.extend],
      fiveTabs,
      "extend"
    )
    expect(ids(hostedFirst)).toEqual([fluxContinueId, graphs.extend.id])
    expect(
      modelForTab(
        hostedFirst,
        null,
        tabDefaultsOf(fiveTabs, "extend", dreaminaId)
      )
    ).toBe(graphs.extend.id)
    const frameRate = modelsOfTab(catalog, fiveTabs, "frame-rate")
    expect(
      modelForTab(
        frameRate,
        dreaminaId,
        tabDefaultsOf(fiveTabs, "frame-rate", dreaminaId)
      )
    ).toBe(graphs.frameRate.id)
  })
})

describe("the tab of an earlier run", () => {
  it("is the tab of its hosted model, or the operation a graph run names", () => {
    expect(tabOfRun({ model: briaId }, catalog, fiveTabs)).toBe("background")
    expect(tabOfRun({ model: fluxEditId }, catalog, fiveTabs)).toBe("edit")
    expect(
      tabOfRun({ model: graphs.reframe.id, mode: "reframe" }, catalog, fiveTabs)
    ).toBe("reframe")
    expect(tabOfRun({ model: "bfl/unlisted" }, catalog, fiveTabs)).toBeNull()
  })
})

describe("the clip well's input", () => {
  it("is the video input of a hosted model's schema, and source for a graph", () => {
    expect(clipFieldOf(dreamina)).toEqual({ name: "video", isHosted: true })
    expect(clipFieldOf(fluxEdit)).toEqual({ name: "videoUrl", isHosted: true })
    expect(clipFieldOf(bria)).toEqual({ name: "video", isHosted: true })
    expect(clipFieldOf(graphs.background)).toEqual({
      name: "source",
      isHosted: false,
    })
    expect(clipFieldOf(null)).toEqual({ name: "source", isHosted: false })
  })
})
