import {
  TabBar,
  TabBarGenerate,
  TabBarLink,
  tabBarCover,
} from "@rosesfield/ui/components/tab-bar"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function renderBar() {
  render(
    <TabBar label="Areas">
      <TabBarLink href="/" icon={<svg />} current>
        Explore
      </TabBarLink>
      <TabBarLink href="/library" icon={<svg />}>
        Library
      </TabBarLink>
      <TabBarGenerate label="Generate" />
      <TabBarLink href="/history" icon={<svg />}>
        History
      </TabBarLink>
      <TabBarLink href="/connect" icon={<svg />}>
        Connect
      </TabBarLink>
    </TabBar>
  )
}

describe("TabBar", () => {
  it("sticks to the foot under the width switch, five equal columns in one 48 px row", () => {
    renderBar()
    const bar = screen.getByRole("navigation", { name: "Areas" })
    expect(bar.className.split(" ")).toEqual(
      expect.arrayContaining(["sticky", "bottom-0", "p-s1", "@regular:hidden"])
    )
    const row = bar.querySelector("[data-slot='app-bar-tabs']")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["grid-cols-5", "h-12"])
    )
  })

  it("wears the regular material with a seam above it in light, and no gradient", () => {
    renderBar()
    const bar = screen.getByRole("navigation", { name: "Areas" })
    const classes = bar.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "material",
        "before:shadow-seam",
        "before:-scale-y-100",
        "dark:before:shadow-none",
      ])
    )
    expect(bar.querySelector("[data-slot='app-bar-glow']")).toBeNull()
    expect(bar.outerHTML).not.toMatch(/linear|gradient/)
    expect(tabBarCover).toBe("[--covered-bottom:0px]")
  })

  it("presses its links and Generate on the press preset, with no shift or dimming", () => {
    renderBar()
    for (const control of [
      screen.getByRole("link", { name: "Library" }),
      screen.getByRole("button", { name: "Generate" }),
    ]) {
      const classes = control.className.split(" ")
      expect(classes).toContain("motion-press")
      expect(
        classes.filter((name) => /translate|active:opacity/.test(name))
      ).toEqual([])
    }
  })

  it("names Generate with no label, a 66 by 40 key at the 13 px radius", () => {
    renderBar()
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(generate.textContent).toBe("")
    expect(generate.className.split(" ")).toEqual(
      expect.arrayContaining(["h-field", "w-16.5", "rounded-cell"])
    )
  })

  it("marks the current link by its colour, with no badge or count", () => {
    renderBar()
    const explore = screen.getByRole("link", { name: "Explore" })
    expect(explore.getAttribute("aria-current")).toBe("page")
    expect(explore.textContent).toBe("Explore")
    expect(explore.className).toContain("aria-[current=page]:text-ink")
  })
})
