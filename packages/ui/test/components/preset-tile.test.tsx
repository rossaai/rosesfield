import { PresetGrid, PresetTile } from "@rosesfield/ui/components/preset-tile"
import { PRESET_TILE } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { readSource } from "../read-source"

afterEach(cleanup)

describe("PresetTile", () => {
  it("hands a plain press on its action to onSelect, and keeps the href for a new tab", () => {
    const selected: string[] = []
    render(
      <PresetTile
        name="Melt"
        href="/explore/melt"
        viewLabel="View Melt"
        action={{
          label: "Try it",
          href: "/apps/effects",
          onSelect: () => selected.push("melt"),
        }}
        clip={{ src: "melt.mp4", alt: "Melt" }}
        aspect={{ width: 9, height: 16 }}
      />
    )
    const action = screen.getByRole("link", { name: "Try it" })
    expect(fireEvent.click(action)).toBe(false)
    expect(selected).toEqual(["melt"])
    expect(fireEvent.click(action, { metaKey: true })).toBe(true)
    expect(selected).toEqual(["melt"])
    expect(action.getAttribute("href")).toBe("/apps/effects")
  })

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

function darkHexOf(token: string): string {
  const declared = new RegExp(`--${token}:[^;]*--if-dark, (#[0-9a-f]+)`)
  const hex = declared.exec(readSource("tokens.css"))?.[1]
  if (hex === undefined) {
    throw new Error(`no dark value for --${token}`)
  }
  return hex
}

function channelsOf(hex: string): number[] {
  return [1, 3, 5, 7]
    .map((at) => hex.slice(at, at + 2))
    .filter((pair) => pair !== "")
    .map((pair) => Number.parseInt(pair, 16) / 255)
}

function luminanceOf(rgb: readonly number[]): number {
  const [r = 0, g = 0, b = 0] = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe("the effect tile's line on its wash", () => {
  it("reads at the 4.5 to 1 text contrast over the wash on the brightest clip", () => {
    render(
      <PresetTile
        name="Melt"
        href="/explore/melt"
        viewLabel="View Melt"
        line="Turns a photo to wax"
        clip={{ src: "melt.mp4", alt: "Melt" }}
        aspect={{ width: 16, height: 9 }}
      />
    )
    const line = document.querySelector("[data-slot='preset-tile-line']")
    const tone = line?.className
      .split(" ")
      .find((name) => /^text-ink(-[a-z]+)?$/.test(name))
      ?.slice("text-".length)
    if (tone === undefined) {
      throw new Error("the line names no text tone")
    }
    const [red = 0, green = 0, blue = 0, alpha = 1] = channelsOf(
      darkHexOf("scrim")
    )
    const wash = [red, green, blue].map(
      (value) => value * alpha + 1 * (1 - alpha)
    )
    const text = luminanceOf(channelsOf(darkHexOf(tone)))
    const ground = luminanceOf(wash)
    const contrast =
      (Math.max(text, ground) + 0.05) / (Math.min(text, ground) + 0.05)
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })
})
