import { act, cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TopBar } from "@/shell/top-bar"
import { renderAt } from "./shell-router"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function rowAt(path: string): Promise<HTMLElement> {
  renderAt(path, () => <TopBar />)
  const bar = await screen.findByRole("banner", { name: "Rosesfield" })
  const row = bar.querySelector<HTMLElement>("[data-slot='app-bar-overflow']")
  if (row === null) {
    throw new Error("the bar holds no links")
  }
  return row
}

function linksOf(row: HTMLElement): (string | null)[] {
  return [...row.querySelectorAll("[data-slot='app-bar-areas']")].map(
    (link) => link.textContent
  )
}

const everyLink = [
  "Explore",
  "Image",
  "Video",
  "Audio",
  "3D",
  "MCP",
  "AgentFeatured",
  "MotionFeatured",
  "AI InfluencerFeatured",
  "Characters",
  "Library",
  "History",
  "Settings",
]

describe("the top bar's row on a computer", () => {
  it("keeps every link in the row and no menu in it, however narrow the row", async () => {
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
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ width: 100 }) as DOMRect
    )
    const row = await rowAt("/")
    Object.defineProperty(row, "clientWidth", { value: 300 })
    Object.defineProperty(row, "scrollWidth", { value: 1300 })
    act(() => resized())
    expect(linksOf(row)).toEqual(everyLink)
    expect(row.querySelector("[hidden]")).toBeNull()
    expect(
      within(row).queryByRole("button", { name: "Open the menu" })
    ).toBeNull()
    expect(row.hasAttribute("data-overflow")).toBe(true)
  })

  it("scrolls the row sideways instead", async () => {
    const row = await rowAt("/library")
    expect(row.className.split(" ")).toEqual(
      expect.arrayContaining(["overflow-x-auto", "[scrollbar-width:none]"])
    )
    expect(linksOf(row)).toEqual(everyLink)
  })

  it("keeps one menu of every area for a phone, outside the row", async () => {
    const row = await rowAt("/")
    const bar = row.closest("header")
    if (bar === null) {
      throw new Error("the row sits in no bar")
    }
    const menus = within(bar).getAllByRole("button", { name: "Open the menu" })
    expect(menus).toHaveLength(1)
    expect(row.contains(menus[0] ?? null)).toBe(false)
  })
})
