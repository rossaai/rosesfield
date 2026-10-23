import { describe, expect, it } from "vitest"
import {
  defaultsOfTab,
  modelForTab,
  modelsOfTab,
  openingTab,
  shownTabs,
  tabsOfModel,
  textModel,
} from "@/studio/three-d/three-d-tabs"
import {
  either,
  formless,
  graph,
  hunyuan,
  meshy6,
  meshy71,
  threeDApp,
} from "./three-d-models"

const app = threeDApp()
const models = [hunyuan, either, meshy6, meshy71, graph, formless]

describe("the 3D tabs", () => {
  it("lists in From an image every model that takes an image, Rosesfield's graph with them", () => {
    expect(modelsOfTab(models, "image", app).map((one) => one.id)).toEqual([
      "tencent/hunyuan-3d-3",
      "tripo/tripo-3",
      "pixal3d-trellis-2",
      "acme/mesh-1",
    ])
  })

  it("lists in From text every model that takes a prompt and needs no image", () => {
    expect(modelsOfTab(models, "text", app).map((one) => one.id)).toEqual([
      "tripo/tripo-3",
      "meshy/meshy-6",
      "meshy/meshy-7.1",
      "acme/mesh-1",
    ])
  })

  it("keeps the graph out of From text while its image is required", () => {
    expect(tabsOfModel(graph, app)).toEqual(["image"])
    expect(tabsOfModel(hunyuan, app)).toEqual(["image"])
  })

  it("opens From an image on the graph and From text on Meshy 7.1", () => {
    expect(defaultsOfTab(models, "image")).toEqual(["pixal3d-trellis-2"])
    expect(defaultsOfTab(models, "text")).toEqual([textModel])
    expect(textModel).toBe("meshy/meshy-7.1")
  })

  it("opens on From text and shows From an image only while the catalog lists a model for it", () => {
    expect(openingTab).toBe("text")
    expect(shownTabs(models, app)).toEqual(["text", "image"])
    expect(shownTabs([meshy6, meshy71], app)).toEqual(["text"])
    expect(shownTabs([], app)).toEqual(["text"])
    expect(shownTabs([meshy71, graph], app)).toEqual(["text", "image"])
  })

  it("picks the first id the tab lists, then the tab's first model", () => {
    const text = modelsOfTab(models, "text", app)
    expect(modelForTab(text, [null, "pixal3d-trellis-2", textModel])).toBe(
      textModel
    )
    expect(modelForTab(text, ["meshy/meshy-6", textModel])).toBe(
      "meshy/meshy-6"
    )
    expect(modelForTab(text, ["gone/model"])).toBe("tripo/tripo-3")
    expect(modelForTab([], [textModel])).toBeNull()
  })
})
