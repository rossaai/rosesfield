import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GridSkeleton, PagingSkeleton } from "@/screens/library/library-grid"
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

describe("the skeleton of a search with no match yet", () => {
  it("reads the next page itself, without waiting for a sentinel to scroll into view, and asks nothing while a page is on its way", () => {
    const fetchMore = vi.fn()
    const { rerender } = render(
      <PagingSkeleton
        size={1}
        read={20}
        isFetching={false}
        fetchMore={fetchMore}
      />
    )
    expect(fetchMore).toHaveBeenCalledTimes(1)
    rerender(
      <PagingSkeleton
        size={1}
        read={20}
        isFetching={true}
        fetchMore={fetchMore}
      />
    )
    expect(fetchMore).toHaveBeenCalledTimes(1)
    rerender(
      <PagingSkeleton
        size={1}
        read={40}
        isFetching={false}
        fetchMore={fetchMore}
      />
    )
    expect(fetchMore).toHaveBeenCalledTimes(2)
  })
})
