import {
  AppBar,
  AppBarAction,
  AppBarFold,
  foldCount,
} from "@rosesfield/ui/components/app-bar"
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
  it("sits sticky across the top on the canvas, its row 53 px tall with 16 px sides", () => {
    const bar = renderBar("full")
    expect(bar.className.split(" ")).toEqual(
      expect.arrayContaining([
        "sticky",
        "top-0",
        "w-full",
        "bg-canvas",
        "px-s5",
      ])
    )
    const row = bar.querySelector("[data-slot='app-bar-row']")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-header", "gap-s4", "motion-yield"])
    )
  })

  it("shrinks its row to 30 px and a 16 by 24 px mark on an app page, from the width switch, on the yield preset", () => {
    const bar = renderBar("compact")
    const row = bar.querySelector("[data-slot='app-bar-row']")
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-header", "@regular:h-tab", "motion-yield"])
    )
    const mark = screen.getByTestId("mark").parentElement
    expect(mark?.className.split(" ")).toEqual(
      expect.arrayContaining(["@regular:h-4", "@regular:w-6", "motion-yield"])
    )
  })

  it("rests on the canvas and wears the regular material and the seam once content runs under it", () => {
    render(
      <AppBar
        label="Rest"
        scrolled={false}
        mark={null}
        lockup={null}
        areas={null}
      />
    )
    render(
      <AppBar
        label="Scrolled"
        scrolled
        mark={null}
        lockup={null}
        areas={null}
      />
    )
    const rest = screen.getByRole("banner", { name: "Rest" })
    const scrolled = screen.getByRole("banner", { name: "Scrolled" })
    expect(rest.getAttribute("data-scrolled")).toBe("no")
    expect(scrolled.getAttribute("data-scrolled")).toBe("yes")
    expect(scrolled.className.split(" ")).toEqual(
      expect.arrayContaining([
        "data-[scrolled=yes]:material",
        "data-[scrolled=yes]:shadow-seam",
        "dark:data-[scrolled=yes]:shadow-none",
        "motion-tint",
      ])
    )
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

  it("clips the links to their box and never scrolls them sideways", () => {
    const bar = renderBar("full")
    const overflow = bar.querySelector("[data-slot='app-bar-overflow']")
    expect(overflow?.hasAttribute("data-overflow")).toBe(false)
    const classes = overflow?.className.split(" ") ?? []
    expect(classes).toEqual(
      expect.arrayContaining([
        "h-button",
        "overflow-hidden",
        "hidden",
        "@regular:flex",
        "-m-[calc(var(--spacing-focus-ring)*2)]",
        "p-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
    expect(classes).not.toContain("overflow-x-auto")
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
  it("stands 36 px in the full bar with its icon before its label, and presses on the press preset", () => {
    const { balance } = renderActions("full")
    expect(balance.firstElementChild).toBe(screen.getByTestId("coins"))
    expect(balance.lastElementChild?.textContent).toBe("12.5 credits")
    const classes = balance.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining(["h-button", "rounded-full", "motion-press"])
    )
    expect(classes.filter((name) => name.includes("after:"))).toEqual([])
  })

  it("shrinks to the 26 px small size in the compact bar", () => {
    const { balance, connect } = renderActions("compact")
    for (const action of [balance, connect]) {
      expect(action.className.split(" ")).toEqual(
        expect.arrayContaining(["@regular:h-button-small", "@regular:px-s3"])
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

describe("foldCount", () => {
  it("folds nothing when the links fit their room", () => {
    expect(
      foldCount({ full: 500, widths: [100, 100], more: 40, room: 500 })
    ).toBe(0)
  })

  it("folds the fewest units, first rank first, that make the links and the menu fit", () => {
    expect(
      foldCount({ full: 500, widths: [100, 100], more: 40, room: 450 })
    ).toBe(1)
    expect(
      foldCount({ full: 500, widths: [100, 100], more: 40, room: 440 })
    ).toBe(1)
    expect(
      foldCount({ full: 500, widths: [100, 100], more: 40, room: 439 })
    ).toBe(2)
  })

  it("folds every unit when even that leaves no room", () => {
    expect(
      foldCount({ full: 500, widths: [100, 100], more: 40, room: 100 })
    ).toBe(2)
  })
})

function stubWidths(units: Record<string, number>, more: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const width = (element: Element): number => {
        if (element instanceof HTMLElement && element.hidden) {
          return 0
        }
        const rank = element.getAttribute("data-fold-rank")
        if (rank !== null) {
          return units[rank] ?? 0
        }
        if (element.hasAttribute("data-fold-more")) {
          return more
        }
        return [...element.children].reduce(
          (sum, child) => sum + width(child),
          0
        )
      }
      return { width: width(this) } as DOMRect
    }
  )
}

function renderFolding(): {
  overflow: HTMLElement
  resize: () => void
  menus: number[]
} {
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
  const menus: number[] = []
  render(
    <AppBar
      label="Rosesfield"
      mark={null}
      lockup={null}
      areas={
        <>
          <AppBarFold rank={3}>
            <NavLink href="/">Explore</NavLink>
          </AppBarFold>
          <AppBarFold rank={2}>
            <NavLink href="/library">Library</NavLink>
          </AppBarFold>
          <AppBarFold rank={1}>
            <NavLink href="/settings">Settings</NavLink>
          </AppBarFold>
        </>
      }
      areaMenu={(folded) => {
        if (folded !== null) {
          menus.push(folded)
        }
        return <button type="button">Menu</button>
      }}
    />
  )
  const overflow = screen
    .getByRole("banner", { name: "Rosesfield" })
    .querySelector<HTMLElement>("[data-slot='app-bar-overflow']")
  if (overflow === null) {
    throw new Error("no overflow")
  }
  return { overflow, resize: () => act(() => resized()), menus }
}

function foldedRanks(overflow: HTMLElement): string[] {
  return [...overflow.querySelectorAll("[data-fold-rank][hidden]")].map(
    (element) => element.getAttribute("data-fold-rank") ?? ""
  )
}

describe("AppBar's area links on resize", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("shows every link and no menu while they fit", () => {
    stubWidths({ "1": 100, "2": 100, "3": 100 }, 40)
    const { overflow, resize } = renderFolding()
    Object.defineProperty(overflow, "clientWidth", { value: 300 })
    resize()
    expect(foldedRanks(overflow)).toEqual([])
    expect(
      overflow.querySelector("[data-fold-more]")?.hasAttribute("hidden")
    ).toBe(true)
    expect(overflow.hasAttribute("data-overflow")).toBe(false)
  })

  it("folds the first rank into the menu once the bar narrows, and hands the menu the count", () => {
    stubWidths({ "1": 100, "2": 100, "3": 100 }, 40)
    const { overflow, resize, menus } = renderFolding()
    Object.defineProperty(overflow, "clientWidth", { value: 299 })
    resize()
    expect(foldedRanks(overflow)).toEqual(["1"])
    expect(
      overflow.querySelector("[data-fold-more]")?.hasAttribute("hidden")
    ).toBe(false)
    expect(overflow.hasAttribute("data-overflow")).toBe(true)
    expect(menus.at(-1)).toBe(1)
  })

  it("measures every link again, the folded ones included, when the bar widens", () => {
    stubWidths({ "1": 100, "2": 100, "3": 100 }, 40)
    const { overflow, resize } = renderFolding()
    let room = 150
    Object.defineProperty(overflow, "clientWidth", { get: () => room })
    resize()
    expect(foldedRanks(overflow)).toEqual(["2", "1"])
    room = 300
    resize()
    expect(foldedRanks(overflow)).toEqual([])
  })
})
