import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TopBar } from "@/shell/top-bar"
import { renderAt } from "./shell-router"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function barAt(path: string): Promise<HTMLElement> {
  renderAt(path, () => <TopBar />)
  return screen.findByRole("banner", { name: "Rosesfield" })
}

describe("the top bar's fold", () => {
  it("folds Settings, then History, into one menu at the end of the links once they outgrow the bar", async () => {
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
    const width = (element: Element): number => {
      if (element instanceof HTMLElement && element.hidden) {
        return 0
      }
      if (element.hasAttribute("data-fold-rank")) {
        return 100
      }
      if (element.hasAttribute("data-fold-more")) {
        return 40
      }
      return [...element.children].reduce((sum, child) => sum + width(child), 0)
    }
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        return { width: width(this) } as DOMRect
      }
    )
    const bar = await barAt("/")
    const overflow = bar.querySelector<HTMLElement>(
      "[data-slot='app-bar-overflow']"
    )
    if (overflow === null) {
      throw new Error("the bar holds no links")
    }
    const units = overflow.querySelectorAll("[data-fold-rank]")
    expect(units).toHaveLength(11)
    Object.defineProperty(overflow, "clientWidth", { value: 1000 })
    act(() => resized())
    const folded = [
      ...overflow.querySelectorAll("[data-fold-rank][hidden]"),
    ].map((unit) => unit.textContent)
    expect(folded).toEqual(["History", "Settings"])
    const more = overflow.querySelector("[data-fold-more]")
    expect(more?.hasAttribute("hidden")).toBe(false)
    const trigger = within(more as HTMLElement).getByRole("button", {
      name: "Open the menu",
    })
    fireEvent.mouseDown(trigger)
    const items = await screen.findAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "History",
      "Settings",
    ])
  })

  it("keeps the media menus and the featured pair longest, folding the rest and MCP first", async () => {
    const bar = await barAt("/")
    const ranks = [...bar.querySelectorAll("[data-fold-rank]")].map((unit) => [
      unit.textContent,
      Number(unit.getAttribute("data-fold-rank")),
    ])
    expect(ranks).toEqual([
      ["Explore", 11],
      ["Image", 10],
      ["Video", 9],
      ["Audio", 8],
      ["3D", 7],
      ["MCP", 5],
      ["AgentFeaturedMotionFeaturedAI InfluencerFeatured", 6],
      ["Characters", 4],
      ["Library", 3],
      ["History", 2],
      ["Settings", 1],
    ])
  })
})
