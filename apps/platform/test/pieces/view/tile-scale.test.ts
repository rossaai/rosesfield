import { describe, expect, it } from "vitest"
import {
  columnClassOf,
  columnCount,
  columnLayout,
  runCardColumnsOf,
  tileScale,
  tileSizes,
  tileStepOf,
} from "@/pieces/view/tile-scale"

describe("the one tile scale", () => {
  it("steps 160, 228, 320 and 464 px wide, opening on the second step", () => {
    expect(tileScale.map((step) => step.width)).toEqual([160, 228, 320, 464])
    expect(tileSizes).toEqual({ min: 0, max: 3, start: 1 })
    expect(tileStepOf(tileSizes.start).width).toBe(228)
    expect(tileStepOf(99).width).toBe(464)
    expect(tileStepOf(-3).width).toBe(160)
  })

  it("gives each step a class of its own width", () => {
    expect(tileScale.map((step) => step.className)).toEqual([
      "w-40",
      "w-57",
      "w-80",
      "w-116",
    ])
  })

  it("stands 3, 2, 2 and 1 columns on a phone, whatever the phone's width", () => {
    expect([0, 1, 2, 3].map((size) => columnCount(358, size, false))).toEqual([
      3, 2, 2, 1,
    ])
    expect(columnCount(600, 1, false)).toBe(2)
  })

  it("lays run cards 3, 2, 1 and 1 across", () => {
    expect([0, 1, 2, 3].map(runCardColumnsOf)).toEqual([3, 2, 1, 1])
  })

  it("stands 6 columns of 228 px across a 1440 px page, and more or fewer at the other steps", () => {
    expect(columnCount(1408, 1, true)).toBe(6)
    expect(columnCount(1408, 0, true)).toBe(8)
    expect(columnCount(1408, 2, true)).toBe(4)
    expect(columnCount(1408, 3, true)).toBe(3)
    expect(columnCount(800, 1, true)).toBe(3)
    expect(columnCount(200, 1, true)).toBe(1)
  })

  it("fills the row when the items fill it, and keeps a few at the row's start with no empty column", () => {
    expect(columnLayout(40, 1408, 1, true)).toEqual({ count: 6, fills: true })
    expect(columnLayout(1, 1408, 1, true)).toEqual({ count: 1, fills: false })
    expect(columnLayout(3, 1408, 1, true)).toEqual({ count: 3, fills: false })
    expect(columnLayout(1, 358, 3, false)).toEqual({ count: 1, fills: true })
  })

  it("keeps a short phone row's columns at the smallest step, and a wide window's at the chosen step", () => {
    expect(columnClassOf(3, false)).toBe("w-40")
    expect(columnClassOf(2, true)).toBe("w-80")
  })
})
