import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { assetOf, renderPlace, runOf } from "../place-screens"

const door = runOf(
  "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
  "a red door in fog",
  ["3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"]
)
const boat = runOf("2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02", "a blue boat", [
  "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02",
])
const seeds = {
  runs: [door, boat],
  assets: [
    assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01", door.id),
    assetOf("3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02", boat.id),
  ],
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  vi.stubGlobal("innerWidth", 1440)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

function gridItems(): number {
  return document.querySelectorAll(
    "[data-slot='result-grid'] [data-slot='grid-item']"
  ).length
}

describe("Library's view", () => {
  it("opens on Grid at 228 px tiles, with the four-step size row", async () => {
    renderPlace("/library", seeds)
    await vi.waitFor(() => expect(gridItems()).toBe(2))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "View" }))
    })
    const slider = await screen.findByRole("slider", { hidden: true })
    expect(slider.getAttribute("max")).toBe("3")
    expect(slider.getAttribute("value")).toBe("1")
    const grid = screen.getByRole("menuitemradio", { name: "Grid" })
    expect(grid.getAttribute("aria-checked")).toBe("true")
  })

  it("keeps the layout you choose, and opens on it next time", async () => {
    renderPlace("/library", seeds)
    await vi.waitFor(() => expect(gridItems()).toBe(2))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "View" }))
    })
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "List" }))
    await vi.waitFor(() => expect(gridItems()).toBe(0))
    cleanup()
    renderPlace("/library", seeds)
    await vi.waitFor(() =>
      expect(document.querySelectorAll("li").length).toBeGreaterThan(0)
    )
    expect(gridItems()).toBe(0)
  })

  it("keeps its search words in the address as q, with every word matched", async () => {
    const router = renderPlace("/library", seeds)
    await vi.waitFor(() => expect(gridItems()).toBe(2))
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
    fireEvent.change(
      screen.getByRole("searchbox", { name: t("library.search.label") }),
      { target: { value: "fog door" } }
    )
    await vi.waitFor(() => expect(gridItems()).toBe(1))
    expect(router.state.location.search).toEqual({ q: "fog door" })
  })
})
