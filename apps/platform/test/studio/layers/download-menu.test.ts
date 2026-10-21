import { describe, expect, it } from "vitest"
import { downloadsOf } from "@/studio/layers/download-menu"
import type { LayerRow } from "@/studio/layers/layer-list"
import { editedLayer, firstLayer, photo, secondLayer } from "./layers-fixtures"

function rowOf(options: {
  key: string
  number: number
  shown: string
  isHidden: boolean
}): LayerRow {
  return {
    layer: {
      key: options.key,
      number: options.number,
      versions: [options.key],
      working: 0,
    },
    shown: options.shown,
    isHidden: options.isHidden,
    isPicked: false,
    isTop: false,
    isBottom: false,
  }
}

const runId = "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e"

const topFirst: LayerRow[] = [
  rowOf({ key: photo, number: 3, shown: photo, isHidden: false }),
  rowOf({ key: secondLayer, number: 2, shown: editedLayer, isHidden: true }),
  rowOf({ key: firstLayer, number: 1, shown: firstLayer, isHidden: false }),
]

describe("the files Download makes of a stack", () => {
  it("flattens the layers that show, bottom first, in the version each shows", () => {
    expect(downloadsOf(runId, topFirst).flat).toEqual({
      name: "rosesfield-layers-7d1e2f30.png",
      assetIds: [firstLayer, photo],
    })
  })

  it("saves one file for each layer that shows and none for a hidden one", () => {
    expect(downloadsOf(runId, topFirst).each).toEqual([
      { name: "rosesfield-layers-7d1e2f30-1.png", assetId: firstLayer },
      { name: "rosesfield-layers-7d1e2f30-3.png", assetId: photo },
    ])
  })
})
