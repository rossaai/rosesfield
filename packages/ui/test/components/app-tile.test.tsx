import { AppTile, AppTileGrid } from "@rosesfield/ui/components/app-tile"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("AppTile", () => {
  it("is one link with a 20 px icon, its name and one line, 130 px tall, in 3 columns 12 px apart", () => {
    render(
      <AppTileGrid label="Apps">
        <AppTile href="/apps/image" name="Image" line="Words to a picture" icon={<svg />} />
      </AppTileGrid>
    )
    const tile = screen.getByRole("link", { name: /Image/ })
    expect(tile.getAttribute("href")).toBe("/apps/image")
    expect(tile.querySelectorAll("a, button")).toHaveLength(0)
    expect(tile.className.split(" ")).toEqual(
      expect.arrayContaining(["@regular:h-32.5", "h-33.5"])
    )
    const grid = screen.getByRole("navigation", { name: "Apps" }).firstElementChild
    expect(grid?.className.split(" ")).toEqual(
      expect.arrayContaining(["grid-cols-2", "gap-2", "@regular:grid-cols-3", "@regular:gap-3"])
    )
  })
})
