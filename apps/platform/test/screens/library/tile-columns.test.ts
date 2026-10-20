import { describe, expect, it } from "vitest"
import {
  columnCount,
  packColumns,
  tileStepOf,
  tileSteps,
} from "@/screens/library/tile-columns"

const wide = { width: 16, height: 9 }
const tall = { width: 9, height: 16 }

describe("the grid's tiles", () => {
  it("are 330 px wide at the first size and 300 px on a phone", () => {
    expect(tileStepOf(2, true).width).toBe(330)
    expect(tileStepOf(2, false).width).toBe(300)
    expect(tileStepOf(99, true)).toBe(tileSteps.at(-1))
    expect(tileStepOf(-3, true)).toBe(tileSteps[0])
  })

  it("stand in 3 columns at 1440 px, fewer when the window is narrow, and 1 on a phone", () => {
    const tile = tileStepOf(2, true)
    expect(columnCount(1408, tile, true)).toBe(3)
    expect(columnCount(800, tile, true)).toBe(2)
    expect(columnCount(200, tile, true)).toBe(1)
    expect(columnCount(358, tile, false)).toBe(1)
    expect(columnCount(1408, tileStepOf(0, true), true)).toBe(4)
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
