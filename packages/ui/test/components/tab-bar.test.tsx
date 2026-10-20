import {
  TabBar,
  TabBarGenerate,
  TabBarLink,
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
    expect(bar.firstElementChild?.className.split(" ")).toEqual(
      expect.arrayContaining(["grid-cols-5", "h-12"])
    )
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
