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
      expect.arrayContaining(["sticky", "bottom-0", "p-1", "@regular:hidden"])
    )
    const row = bar.querySelector("[data-slot='app-bar-tabs']")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["grid-cols-5", "h-12"])
    )
  })

  it("lays a glow behind its row that starts 35 px above its top edge", () => {
    renderBar()
    const bar = screen.getByRole("navigation", { name: "Areas" })
    expect(bar.className.split(" ")).not.toContain("bg-canvas")
    const glow = bar.querySelector("[data-slot='app-bar-glow']")
    expect(glow?.getAttribute("aria-hidden")).toBe("true")
    expect(glow?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "absolute",
        "-top-(--app-bar-rise)",
        "bottom-0",
        "-z-1",
        "pointer-events-none",
        "to-canvas",
      ])
    )
  })

  it("raises its glow by one rise, 9 spacing steps, and hands the scrollers above it that rise as their covered bottom below the width switch", () => {
    renderBar()
    const bar = screen.getByRole("navigation", { name: "Areas" })
    const rise = "[--app-bar-rise:calc(var(--spacing)*9)]"
    expect(bar.className.split(" ")).toContain(rise)
    expect(tabBarCover.split(" ")).toEqual([
      rise,
      "[--covered-bottom:var(--app-bar-rise)]",
      "@regular:[--covered-bottom:0px]",
    ])
  })

  it("dims a pressed link to 0.6 and a pressed Generate to 0.9, each 2 px down", () => {
    renderBar()
    const link = screen.getByRole("link", { name: "Library" }).className
    const generate = screen.getByRole("button", { name: "Generate" }).className
    expect(link.split(" ")).toEqual(
      expect.arrayContaining(["active:opacity-60", "active:translate-y-0.5"])
    )
    expect(generate.split(" ")).toEqual(
      expect.arrayContaining(["active:opacity-90", "active:translate-y-0.5"])
    )
    expect(generate).not.toContain("opacity-60")
  })

  it("names Generate with no label, a 66 by 44 key", () => {
    renderBar()
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(generate.textContent).toBe("")
    expect(generate.className.split(" ")).toEqual(
      expect.arrayContaining(["h-11", "w-16.5"])
    )
  })

  it("marks the current link by its colour, with no badge or count", () => {
    renderBar()
    const explore = screen.getByRole("link", { name: "Explore" })
    expect(explore.getAttribute("aria-current")).toBe("page")
    expect(explore.textContent).toBe("Explore")
    expect(explore.className).toContain("active:translate-y-0.5")
  })
})
