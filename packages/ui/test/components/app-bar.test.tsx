import { AppBar, AppBarAction } from "@rosesfield/ui/components/app-bar"
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

  it("on a phone sets the area menu 4 px before the balance, in one group with it", () => {
    const bar = renderBar("full")
    const menu = screen.getByRole("button", { name: "Areas" })
    const balance = bar.querySelector("[data-slot='app-bar-balance']")
    const group = balance?.parentElement
    expect(group?.contains(menu)).toBe(true)
    expect(group?.className.split(" ")).toContain("gap-1")
    expect(menu.parentElement?.nextElementSibling).toBe(balance)
  })

  it("marks the links' scroll start while nothing is scrolled", () => {
    const bar = renderBar("full")
    const overflow = bar.querySelector("[data-slot='app-bar-overflow']")
    expect(overflow?.hasAttribute("data-scroll-start")).toBe(true)
    expect(overflow?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-9",
        "overflow-x-auto",
        "hidden",
        "@regular:flex",
        "-m-[calc(var(--spacing-focus-ring)*2)]",
        "p-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
  })

  it("starts the area links at the list's start, 12 px after the mark, never centred", () => {
    const bar = renderBar("full")
    const links = bar.querySelector("[data-slot='app-bar-overflow'] > div")
    expect(links?.className.split(" ")).not.toContain("mx-auto")
    expect(links?.className.split(" ")).toEqual(
      expect.arrayContaining(["flex", "shrink-0"])
    )
  })
})

function renderActions(density: "full" | "compact") {
  render(
    <AppBar
      label="Rosesfield"
      density={density}
      mark={<svg />}
      lockup={<svg />}
      areas={null}
      balance={
        <AppBarAction icon={<svg data-testid="coins" />}>
          12.5 credits
        </AppBarAction>
      }
      connect={
        <AppBarAction tone="primary" render={<a href="/connect" />}>
          Connect
        </AppBarAction>
      }
    />
  )
  return {
    balance: screen.getByRole("button", { name: "12.5 credits" }),
    connect: screen.getByRole("link", { name: "Connect" }),
  }
}

describe("AppBarAction", () => {
  it("lights a press one step more than a hover, and never changes its size", () => {
    const { balance, connect } = renderActions("full")
    for (const action of [balance, connect]) {
      const classes = action.className.split(" ")
      expect(classes).toEqual(
        expect.arrayContaining([
          "hover:after:opacity-10",
          "active:after:opacity-20",
          "in-data-[gallery=press]:after:opacity-20",
        ])
      )
      expect(classes).not.toContain("active:after:opacity-10")
      expect(classes.filter((name) => /scale/.test(name))).toEqual([])
    }
  })

  it("holds a 16 px icon, then its label, 8 px apart, on a 36 px control", () => {
    const { balance } = renderActions("full")
    expect(balance.firstElementChild).toBe(screen.getByTestId("coins"))
    expect(balance.lastElementChild?.textContent).toBe("12.5 credits")
    expect(balance.className.split(" ")).toEqual(
      expect.arrayContaining(["h-9", "px-3", "gap-2", "[&_svg]:glyph"])
    )
    expect(balance.className).not.toContain("@regular:h-6")
  })

  it("shrinks to 24 px with 10 px sides and a 6 px gap with the compact bar", () => {
    const { balance, connect } = renderActions("compact")
    for (const action of [balance, connect]) {
      expect(action.className.split(" ")).toEqual(
        expect.arrayContaining([
          "h-9",
          "@regular:h-6",
          "@regular:px-2.5",
          "@regular:gap-1.5",
        ])
      )
    }
  })

  it("moves its height, padding and gap with the bar over the surface duration", () => {
    const { balance, connect } = renderActions("compact")
    for (const action of [balance, connect]) {
      expect(action.className.split(" ")).toEqual(
        expect.arrayContaining([
          "transition-[height,padding,gap]",
          "duration-(--duration-surface)",
        ])
      )
    }
  })

  it("renders the element the caller gives, such as a link", () => {
    const { balance, connect } = renderActions("full")
    expect(balance.getAttribute("type")).toBe("button")
    expect(connect.tagName).toBe("A")
    expect(connect.getAttribute("href")).toBe("/connect")
    expect(connect.hasAttribute("type")).toBe(false)
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
