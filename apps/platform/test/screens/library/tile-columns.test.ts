import { describe, expect, it } from "vitest"
import {
  columnCount,
  columnLayout,
  packColumns,
  phoneColumns,
  stepOf,
  tileStepOf,
  tileSteps,
} from "@/screens/library/tile-columns"
import { tileSizes } from "@/screens/library/view-cluster"

const wide = { width: 16, height: 9 }
const tall = { width: 9, height: 16 }

describe("the grid's tiles", () => {
  it("step 194, 228 and 464 px wide, the reference's measured sizes, opening at 228", () => {
    expect(tileSteps.map((step) => step.width)).toEqual([194, 228, 464])
    expect(tileStepOf(tileSizes.initial, true).width).toBe(228)
    expect(tileStepOf(99, true)).toBe(tileSteps.at(-1))
    expect(tileStepOf(-3, true)).toBe(tileSteps[0])
  })

  it("stand in 6 columns across a 1440 px page, fewer when the window is narrow", () => {
    const tile = tileStepOf(tileSizes.initial, true)
    expect(columnCount(1408, tile, true)).toBe(6)
    expect(columnCount(800, tile, true)).toBe(3)
    expect(columnCount(200, tile, true)).toBe(1)
    expect(columnCount(1408, tileStepOf(0, true), true)).toBe(7)
    expect(columnCount(1408, tileStepOf(2, true), true)).toBe(3)
  })

  it("open a phone at two columns, and let the size choose three, two or one", () => {
    const tile = tileStepOf(tileSizes.initial, false)
    expect(columnCount(358, tile, false, tileSizes.initial)).toBe(2)
    expect(columnCount(358, tile, false, 0)).toBe(3)
    expect(columnCount(358, tile, false, 2)).toBe(1)
    expect(phoneColumns).toHaveLength(tileSizes.max - tileSizes.min + 1)
  })

  it("fill the row when the items fill it, and keep one or a few at the row's start with no empty column", () => {
    const tile = tileStepOf(tileSizes.initial, true)
    expect(columnLayout(40, 1408, tile, true)).toEqual({
      count: 6,
      fills: true,
    })
    expect(columnLayout(1, 1408, tile, true)).toEqual({
      count: 1,
      fills: false,
    })
    expect(columnLayout(3, 1408, tile, true)).toEqual({
      count: 3,
      fills: false,
    })
    expect(columnLayout(1, 358, tileStepOf(2, false), false, 2)).toEqual({
      count: 1,
      fills: true,
    })
  })

  it("give every view one step per slider position", () => {
    const classes: ReadonlyArray<readonly string[]> = [
      tileSteps.map((step) => step.className),
    ]
    for (const steps of classes) {
      expect(steps).toHaveLength(tileSizes.max - tileSizes.min + 1)
      expect(new Set(steps).size).toBe(steps.length)
      expect(stepOf(steps, -1)).toBe(steps[0])
      expect(stepOf(steps, 99)).toBe(steps.at(-1))
    }
  })

  it("place each item in the shortest column so tall and wide items do not align", () => {
    const items = [
      { id: "a", aspect: tall },
      { id: "b", aspect: wide },
      { id: "c", aspect: wide },
      { id: "d", aspect: wide },
      { id: "e", aspect: wide },
    ]
    const columns = packColumns(items, 3, (item) => item.aspect)
    expect(columns.map((column) => column.map((item) => item.id))).toEqual([
      ["a"],
      ["b", "d"],
      ["c", "e"],
    ])
    expect(packColumns(items, 0, (item) => item.aspect)).toHaveLength(1)
  })
})
