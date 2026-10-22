import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GridSkeleton } from "@/screens/library/library-grid"
import { columnCount, tileStepOf } from "@/screens/library/tile-columns"

beforeEach(() => {
  vi.stubGlobal("innerWidth", 800)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the grid's skeleton", () => {
  it("draws the masonry with the column count the loaded grid will take", () => {
    render(<GridSkeleton size={1} />)
    const masonry = document.querySelector("[data-columns]")
    expect(Number(masonry?.getAttribute("data-columns"))).toBe(
      columnCount(800, tileStepOf(1, true), true, 1)
    )
    expect(masonry?.className.split(" ")).toContain("gap-s2")
  })
})
