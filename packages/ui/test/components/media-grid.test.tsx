import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("MediaGrid", () => {
  it("keeps each tile at its own ratio in the masonry layout", () => {
    render(
      <MediaGrid layout="masonry" data-testid="grid">
        <img alt="tall" />
      </MediaGrid>
    )
    const grid = screen.getByTestId("grid")
    expect(grid.className).toContain("columns-2")
    expect(grid.className).not.toContain("aspect-square")
  })

  it("squares each tile by default", () => {
    render(<MediaGrid data-testid="grid" />)
    expect(screen.getByTestId("grid").className).toContain("aspect-square")
  })
})
