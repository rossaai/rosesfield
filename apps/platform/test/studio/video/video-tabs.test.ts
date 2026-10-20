import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  fieldsOfModel,
  imagesForTab,
  modelForTab,
  modelsOfTab,
  slotsOf,
  tabOfInputs,
  tabsOfModel,
} from "@/studio/video/video-tabs"
import { h3MaxTurbo, minimaxH3, pVideo, veoLite } from "./video-forms"

function model(id: string, form: CatalogModel["form"]): CatalogModel {
  return {
    id,
    kind: form === null ? "graph" : "hosted",
    maker: "Maker",
    name: id,
    nameKey: null,
    task: "text-to-video",
    tags: [],
    form,
  }
}

const graph = model("ltx-2-5", null)
const minimax = model("minimax/minimax-h3", [...minimaxH3])
const turbo = model("fal/h3-max-turbo", [...h3MaxTurbo])
const veo = model("veo/veo-3.1-lite-generate-001", [...veoLite])
const pruna = model("pruna/p-video-2", [...pVideo])
const models = [graph, minimax, turbo, veo, pruna]

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

function runOf(images: Record<string, number>): Run {
  const inputs = Object.fromEntries(
    Object.entries(images).map(([name, count]) => [
      name,
      Array.from({ length: count }, () => assetId),
    ])
  )
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId: "video",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "comfy-router", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T15:00:00.000Z",
    finishedAt: "2026-10-19T15:01:00.000Z",
  })
}

describe("the Video tabs", () => {
  it("lists every model in Text and image, models with references in References, and models with a last frame in First and last frame", () => {
    expect(modelsOfTab(models, "text-image").map((one) => one.id)).toEqual(
      models.map((one) => one.id)
    )
    expect(modelsOfTab(models, "references").map((one) => one.id)).toEqual([
      "minimax/minimax-h3",
      "veo/veo-3.1-lite-generate-001",
    ])
    expect(modelsOfTab(models, "first-last").map((one) => one.id)).toEqual([
      "minimax/minimax-h3",
      "veo/veo-3.1-lite-generate-001",
      "pruna/p-video-2",
    ])
    expect(tabsOfModel(graph)).toEqual(["text-image"])
  })

  it("keeps the chosen model, then the default, then the first of a tab", () => {
    const firstLast = modelsOfTab(models, "first-last")
    expect(
      modelForTab(firstLast, "pruna/p-video-2", "minimax/minimax-h3")
    ).toBe("pruna/p-video-2")
    expect(
      modelForTab(firstLast, "fal/h3-max-turbo", "minimax/minimax-h3")
    ).toBe("minimax/minimax-h3")
    expect(modelForTab(firstLast, "fal/h3-max-turbo", "ltx-2-5")).toBe(
      "minimax/minimax-h3"
    )
    const references = modelsOfTab(models, "references")
    expect(
      modelForTab(references, "fal/h3-max-turbo", "minimax/minimax-h3")
    ).toBe("minimax/minimax-h3")
    expect(
      modelForTab(
        references,
        "fal/h3-max-turbo",
        "veo/veo-3.1-lite-generate-001"
      )
    ).toBe("veo/veo-3.1-lite-generate-001")
  })

  it("gives each tab its image slots and limits", () => {
    const fields = fieldsOfModel(minimax)
    expect(slotsOf(fields, "text-image")).toEqual({
      start: { name: "firstFrame", max: 1 },
      references: null,
      last: null,
    })
    expect(slotsOf(fields, "references").references).toEqual({
      name: "references",
      max: 4,
    })
    expect(slotsOf(fields, "first-last")).toEqual({
      start: { name: "firstFrame", max: 1 },
      references: null,
      last: { name: "lastFrame", max: 1 },
    })
    expect(slotsOf(fieldsOfModel(veo), "first-last")).toEqual({
      start: { name: "images", max: 1 },
      references: null,
      last: { name: "instancesLastFrameBytesBase64Encoded", max: 1 },
    })
    expect(slotsOf(null, "text-image").start).toEqual({
      name: "startFrame",
      max: 1,
    })
  })

  it("trims the images a tab does not take", () => {
    const fields = fieldsOfModel(veo)
    const inputs = {
      images: ["a"],
      instancesLastFrameBytesBase64Encoded: ["b"],
      imageBytesBase64Encoded: ["c"],
    }
    expect(imagesForTab(fields, "text-image", inputs)).toEqual({
      instancesLastFrameBytesBase64Encoded: [],
      imageBytesBase64Encoded: [],
    })
    expect(
      imagesForTab(fieldsOfModel(minimax), "first-last", {
        firstFrame: ["a"],
        lastFrame: ["b"],
        references: ["c", "d"],
      })
    ).toEqual({ references: [] })
  })

  it("reads a run's tab from the images it holds", () => {
    const tabOf = (
      images: Record<string, number>,
      model: CatalogModel
    ): string => tabOfInputs(runOf(images).inputs, model)
    expect(
      tabOf({ images: 1, instancesLastFrameBytesBase64Encoded: 1 }, veo)
    ).toBe("first-last")
    expect(tabOf({ imageBytesBase64Encoded: 1 }, veo)).toBe("references")
    expect(tabOf({ references: 2 }, minimax)).toBe("references")
    expect(tabOf({ firstFrame: 1, lastFrame: 1 }, minimax)).toBe("first-last")
    expect(tabOf({ firstFrame: 1 }, minimax)).toBe("text-image")
    expect(tabOf({ startFrame: 1 }, graph)).toBe("text-image")
  })
})
