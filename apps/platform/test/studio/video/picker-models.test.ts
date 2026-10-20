import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { graphTagsOf, pickerModelsOf } from "@/studio/video/picker-models"
import { minimaxH3, pVideo } from "./video-forms"

const video = appListing.parse(findApp("video"))

function model(id: string, form: CatalogModel["form"]): CatalogModel {
  return {
    id,
    kind: form === null ? "graph" : "hosted",
    maker: "Maker",
    name: id,
    nameKey: null,
    task: "text-to-video",
    tags:
      form === null
        ? [{ kind: "open-weights" }]
        : [{ kind: "resolution", value: "1080p" }],
    form,
  }
}

const graph = model("ltx-2-5", null)
const minimax = model("minimax/minimax-h3", [...minimaxH3])
const pruna = model("pruna/p-video-2", [...pVideo])

describe("the models Video's picker lists", () => {
  it("reads a graph's top resolution and length range from the app's own inputs", () => {
    expect(graphTagsOf(video)).toEqual([
      { kind: "resolution", value: "720p" },
      { kind: "length", min: 2, max: 5 },
    ])
  })

  it("lists every model of the open tab, open weights and hosted together", () => {
    expect(
      pickerModelsOf([graph, minimax, pruna], "text-image", video).map(
        (one) => one.id
      )
    ).toEqual(["ltx-2-5", "minimax/minimax-h3", "pruna/p-video-2"])
    expect(
      pickerModelsOf([graph, minimax, pruna], "references", video).map(
        (one) => one.id
      )
    ).toEqual(["minimax/minimax-h3"])
  })

  it("gives a graph its resolution and length, and leaves a hosted model's own tags", () => {
    const [shownGraph, shownMinimax] = pickerModelsOf(
      [graph, minimax],
      "text-image",
      video
    )
    expect(shownGraph?.tags).toEqual([
      { kind: "open-weights" },
      { kind: "resolution", value: "720p" },
      { kind: "length", min: 2, max: 5 },
    ])
    expect(shownMinimax?.tags).toEqual(minimax.tags)
  })
})
