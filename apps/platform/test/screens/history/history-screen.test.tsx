import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { renderPlace, runOf } from "../place-screens"

const runs = [
  runOf("2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01", "a red door in fog", [
    "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01",
  ]),
  runOf("2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02", "a blue boat at dawn", [
    "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02",
    "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f03",
  ]),
]

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

async function openView(): Promise<HTMLElement> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "View" }))
  })
  return screen.findByRole("slider", { hidden: true })
}

describe("History's view", () => {
  it("opens on Grid at 228 px tiles, with the four-step size row", async () => {
    renderPlace("/history", { runs })
    await vi.waitFor(() => expect(gridItems()).toBe(3))
    const slider = await openView()
    expect(slider.getAttribute("max")).toBe("3")
    expect(slider.getAttribute("value")).toBe("1")
    const grid = screen.getByRole("menuitemradio", { name: "Grid" })
    expect(grid.getAttribute("aria-checked")).toBe("true")
  })

  it("opens on the layout and size you chose here before", async () => {
    window.localStorage.setItem(
      "rosesfield.view.history",
      JSON.stringify({ layout: "grid", size: 3 })
    )
    renderPlace("/history", { runs })
    await vi.waitFor(() => expect(gridItems()).toBe(3))
    const slider = await openView()
    expect(slider.getAttribute("value")).toBe("3")
  })

  it("keeps the runs whose prompt, app or model holds every word you type", async () => {
    renderPlace("/history", { runs })
    await vi.waitFor(() => expect(gridItems()).toBe(3))
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
    const field = screen.getByRole("searchbox", {
      name: t("history.search.label"),
    })
    fireEvent.change(field, { target: { value: "boat image" } })
    await vi.waitFor(() => expect(gridItems()).toBe(2))
    fireEvent.change(field, { target: { value: "FOG red" } })
    await vi.waitFor(() => expect(gridItems()).toBe(1))
  })

  it("shows Library's empty state when no run holds the words, and Show everything brings them back", async () => {
    renderPlace("/history", { runs })
    await vi.waitFor(() => expect(gridItems()).toBe(3))
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "door boat" },
    })
    expect(await screen.findByText(t("library.filterEmpty.title"))).toBeTruthy()
    expect(screen.queryByText(t("history.empty.title"))).toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: t("library.filterEmpty.action") })
    )
    await vi.waitFor(() => expect(gridItems()).toBe(3))
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "")
  })
})
