import { PresetTile } from "@rosesfield/ui/components/preset-tile"
import { PRESET_TILE } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("PresetTile", () => {
  it("holds its contract's clip, name, line and action, the card and the action two links", () => {
    render(
      <PresetTile
        name="Melt"
        href="/explore/melt"
        viewLabel="View Melt"
        line="Turns a photo to wax"
        action={{ label: "Try it", href: "/apps/effects?preset=melt" }}
        clip={{ src: "melt.mp4", alt: "Melt" }}
        aspect={{ width: 9, height: 16 }}
      />
    )
    const tile = document.querySelector("[data-slot='preset-tile']")
    for (const slot of PRESET_TILE.slots) {
      expect(tile?.querySelector(`[data-slot='preset-tile-${slot}']`)).not.toBeNull()
    }
    expect(
      screen.getByRole("link", { name: "View Melt" }).getAttribute("href")
    ).toBe("/explore/melt")
    expect(
      screen.getByRole("link", { name: "Try it" }).getAttribute("href")
    ).toBe("/apps/effects?preset=melt")
  })
})
