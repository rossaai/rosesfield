import { describe, expect, it } from "vitest"
import { packColumns } from "@/screens/library/tile-columns"

const wide = { width: 16, height: 9 }
const tall = { width: 9, height: 16 }

describe("the grid's columns", () => {
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
