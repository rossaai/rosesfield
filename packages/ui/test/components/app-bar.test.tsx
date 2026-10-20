import { AppBar } from "@rosesfield/ui/components/app-bar"
import { NavLink } from "@rosesfield/ui/components/nav-link"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

function renderBar(density: "full" | "compact") {
  render(
    <AppBar
      label="Rosesfield"
      density={density}
      mark={<svg data-testid="mark" />}
      lockup={<svg data-testid="lockup" />}
      areas={
        <>
          <NavLink href="/" current>
            Explore
          </NavLink>
          <NavLink href="/apps/image">Image</NavLink>
        </>
      }
      areaMenu={<button type="button">Areas</button>}
      balance={<span>12.5</span>}
      connect={<button type="button">Connect</button>}
    />
  )
  return screen.getByRole("banner", { name: "Rosesfield" })
}

function slotsOf(bar: HTMLElement): string[] {
  return [...bar.querySelectorAll("[data-slot^='app-bar-']")].map(
    (element) => element.getAttribute("data-slot") ?? ""
  )
}

describe("AppBar", () => {
  it("sits sticky across the top, 52 px tall, in one row with 16 px sides and 12 px between groups", () => {
    const bar = renderBar("full")
    expect(bar.className.split(" ")).toEqual(
      expect.arrayContaining([
        "sticky",
        "top-0",
        "w-full",
        "h-13",
        "px-4",
        "gap-3",
      ])
    )
  })

  it("shrinks to 36 px and a 20 px mark on an app page, from the width switch", () => {
    const bar = renderBar("compact")
    expect(bar.className.split(" ")).toEqual(
      expect.arrayContaining(["h-13", "@regular:h-9"])
    )
    const mark = screen.getByTestId("mark").parentElement
    expect(mark?.className.split(" ")).toContain("@regular:size-5")
  })

  it("holds its contract's mark, areas, balance and connect, with Connect last", () => {
    const bar = renderBar("full")
    const slots = slotsOf(bar)
    for (const slot of ["mark", "areas", "balance", "connect"]) {
      expect(slots).toContain(`app-bar-${slot}`)
    }
    const buttons = [...bar.querySelectorAll("button")]
    expect(buttons[buttons.length - 1]?.textContent).toBe("Connect")
  })

  it("marks the links' scroll start while nothing is scrolled", () => {
    const bar = renderBar("full")
    const overflow = bar.querySelector("[data-slot='app-bar-overflow']")
    expect(overflow?.hasAttribute("data-scroll-start")).toBe(true)
    expect(overflow?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-7",
        "overflow-x-auto",
        "hidden",
        "@regular:flex",
      ])
    )
  })
})

describe("AppBar's area links on resize", () => {
  it("measures their overflow again when the bar's width changes", () => {
    let resized: () => void = () => undefined
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback
        }
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      }
    )
    const bar = renderBar("full")
    const overflow = bar.querySelector<HTMLElement>(
      "[data-slot='app-bar-overflow']"
    )
    if (overflow === null) {
      throw new Error("no overflow")
    }
    expect(overflow.style.maskImage).not.toContain("transparent")
    Object.defineProperty(overflow, "clientWidth", { value: 300 })
    Object.defineProperty(overflow, "scrollWidth", { value: 900 })
    act(() => resized())
    expect(overflow.style.maskImage).toContain("transparent")
    vi.unstubAllGlobals()
  })
})
