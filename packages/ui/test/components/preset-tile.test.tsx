import { PresetGrid, PresetTile } from "@rosesfield/ui/components/preset-tile"
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
      expect(
        tile?.querySelector(`[data-slot='preset-tile-${slot}']`)
      ).not.toBeNull()
    }
    expect(
      screen.getByRole("link", { name: "View Melt" }).getAttribute("href")
    ).toBe("/explore/melt")
    expect(
      screen.getByRole("link", { name: "Try it" }).getAttribute("href")
    ).toBe("/apps/effects?preset=melt")
  })
})

describe("the preset tile over its clip", () => {
  it("sets its name and line in the dark scheme, so they read over the darkened clip, and rings the whole tile outside its edge", () => {
    render(
      <PresetTile
        name="Melt"
        href="/explore/melt"
        viewLabel="View Melt"
        line="Turns a photo to wax"
        clip={{ src: "melt.mp4", alt: "Melt" }}
        aspect={{ width: 9, height: 16 }}
      />
    )
    const line = document.querySelector("[data-slot='preset-tile-line']")
    expect(line?.closest("[data-theme]")?.getAttribute("data-theme")).toBe(
      "dark"
    )
    for (const name of document.querySelectorAll(
      "[data-slot='preset-tile-name']"
    )) {
      expect(name.closest("[data-theme]")?.getAttribute("data-theme")).toBe(
        "dark"
      )
    }
    const card = screen.getByRole("link", { name: "View Melt" })
    expect(card.hasAttribute("data-cover")).toBe(true)
    expect(
      document.querySelector("[data-slot='preset-tile']")?.className.split(" ")
    ).toContain("has-[>[data-cover]:focus-visible]:outline-solid")
  })
})

describe("the preset name", () => {
  it("is sized to its card: the display size on a tall card, the title size on a wide one", () => {
    const names = (["tall", "wide"] as const).map((shape) => {
      render(
        <PresetTile
          name="Melt"
          href="/explore/melt"
          viewLabel="View Melt"
          action={{ label: "Recreate", href: "/apps/effects?preset=melt" }}
          clip={{ src: "melt.mp4", alt: "Melt" }}
          aspect={
            shape === "tall"
              ? { width: 9, height: 16 }
              : { width: 16, height: 9 }
          }
        />
      )
      const reveal = document.querySelectorAll("[data-slot='preset-tile-name']")
      const name = reveal[reveal.length - 1]?.className.split(" ") ?? []
      cleanup()
      return name
    })
    expect(names[0]).toContain("text-display")
    expect(names[0]).not.toContain("text-title")
    expect(names[1]).toContain("text-title")
  })
})

describe("PresetGrid", () => {
  it("stands its tiles in 5 column stacks, so 12 tiles fill every column", () => {
    render(
      <PresetGrid label="Presets">
        {Array.from({ length: 12 }, (_, index) => `preset ${index}`).map(
          (name) => (
            <span key={name}>{name}</span>
          )
        )}
      </PresetGrid>
    )
    const stacks = screen
      .getByRole("region", { name: "Presets" })
      .querySelectorAll("[data-slot='media-feed-stack']")
    expect([...stacks].map((stack) => stack.childElementCount)).toEqual([
      3, 3, 2, 2, 2,
    ])
  })
})
