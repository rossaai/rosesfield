import { NavLink, NavSeparator } from "@rosesfield/ui/components/nav-link"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("NavLink", () => {
  it("is text only, 28 px tall with 4 by 8 px padding, flush with the next", () => {
    render(
      <nav>
        <NavLink href="/">Explore</NavLink>
        <NavLink href="/library">Library</NavLink>
      </nav>
    )
    const link = screen.getByRole("link", { name: "Explore" })
    expect(link.querySelector("svg, img")).toBeNull()
    expect(link.className.split(" ")).toEqual(
      expect.arrayContaining(["h-7", "px-2", "py-1", "hover:bg-(--tint)"])
    )
    expect(link.getAttribute("aria-current")).toBeNull()
  })

  it("marks the current link by its text only", () => {
    render(
      <NavLink href="/" current>
        Explore
      </NavLink>
    )
    const link = screen.getByRole("link", { name: "Explore" })
    expect(link.getAttribute("aria-current")).toBe("page")
    expect(link.className).toContain("aria-[current=page]:text-ink")
    expect(link.className).not.toMatch(/aria-\[current=page\]:bg-/)
  })

  it("draws a 1 by 12 px separator", () => {
    const { container } = render(<NavSeparator />)
    expect(container.firstElementChild?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-3", "w-px", "mx-1"])
    )
  })
})
