import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import {
  kindsOf,
  modelForKind,
  modelsOfKind,
  shownKindOf,
} from "@/studio/video/video-kind"

function model(id: string, kind: CatalogModel["kind"]): CatalogModel {
  return {
    id,
    kind,
    maker: "maker",
    name: id,
    nameKey: null,
    task: "text-to-video",
    tags: [],
    form: null,
  }
}

const graph = model("ltx-2-5", "graph")
const hostedOne = model("minimax/minimax-h3", "hosted")
const hostedTwo = model("kling/kling-3", "hosted")
const models = [hostedOne, graph, hostedTwo]

describe("the switch between open weights and hosted models", () => {
  it("offers open weights first, then hosted, only for the kinds the list holds", () => {
    expect(kindsOf(models)).toEqual(["graph", "hosted"])
    expect(kindsOf([hostedOne, hostedTwo])).toEqual(["hosted"])
    expect(kindsOf([])).toEqual([])
  })

  it("shows the kind of the chosen model, or the first kind with none chosen", () => {
    expect(shownKindOf(models, hostedTwo)).toBe("hosted")
    expect(shownKindOf(models, null)).toBe("graph")
    expect(shownKindOf([], null)).toBeNull()
  })

  it("lists only the models of the shown kind in the model row", () => {
    expect(modelsOfKind(models, "hosted")).toEqual([hostedOne, hostedTwo])
    expect(modelsOfKind(models, null)).toEqual(models)
  })

  it("chooses the first model of the other kind, and nothing for the same kind", () => {
    expect(modelForKind(models, graph, "hosted")).toBe(hostedOne.id)
    expect(modelForKind(models, hostedOne, "graph")).toBe(graph.id)
    expect(modelForKind(models, hostedTwo, "hosted")).toBeNull()
  })
})
