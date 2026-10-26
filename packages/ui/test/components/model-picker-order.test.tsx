import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  openBadge,
  openPicker,
  priceOf,
  rowOf,
  shownIds,
} from "./model-picker-fixture"

afterEach(cleanup)

const rank = (place: number) => ({ place, label: `#${place}` })

const rows = [
  rowOf("a", { rank: rank(1), price: priceOf(30) }),
  rowOf("b", { rank: rank(2), price: priceOf(5), badges: [openBadge] }),
  rowOf("c", { rank: rank(3) }),
  rowOf("d", { price: priceOf(12), badges: [openBadge] }),
  rowOf("e"),
]

async function openSort(): Promise<HTMLElement> {
  const shown = screen.queryByRole("menu")
  if (shown !== null) {
    return shown
  }
  fireEvent.click(screen.getByRole("button", { name: "Sort and filter" }))
  return screen.findByRole("menu")
}

async function sortBy(name: string): Promise<void> {
  const menu = await openSort()
  fireEvent.click(within(menu).getByRole("menuitemradio", { name }))
}

describe("ModelPicker's toolbar", () => {
  it("holds the search and one filter button, with no tabs and no other button, and the button opens the Sort menu", async () => {
    openPicker({ rows })
    const toolbar = document.querySelector<HTMLElement>(
      "[data-slot='model-picker-toolbar']"
    )
    if (toolbar === null) {
      throw new Error("no toolbar")
    }
    expect(within(toolbar).queryAllByRole("tab")).toEqual([])
    expect(within(toolbar).queryAllByRole("radio")).toEqual([])
    expect(within(toolbar).getAllByRole("searchbox")).toHaveLength(1)
    const buttons = within(toolbar).getAllByRole("button")
    expect(buttons.map((one) => one.getAttribute("aria-label"))).toEqual([
      "Sort and filter",
    ])
    expect(buttons[0]?.textContent).toBe("")
    expect(toolbar.className).not.toMatch(/border/)
    expect(toolbar.className.split(" ")).toContain("py-s3")
    const search = within(toolbar).getByRole("searchbox")
    expect(search.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-(--well)", "rounded-full", "h-button-dense"])
    )
    expect(buttons[0]?.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-(--well)", "rounded-full", "size-icon-dense"])
    )
    const menu = await openSort()
    expect(
      within(menu)
        .getAllByRole("menuitemradio")
        .map((one) => one.textContent)
    ).toEqual([
      "Rank, best first",
      "Rank, best last",
      "Price, lowest first",
      "Price, highest first",
    ])
    expect(
      within(menu).getByRole("menuitemcheckbox", { name: "Open weights only" })
    ).toBeTruthy()
  })
})

describe("ModelPicker's Sort menu", () => {
  it("opens on rank, best first, the order the rows arrive in", async () => {
    openPicker({ rows })
    expect(shownIds()).toEqual(["a", "b", "c", "d", "e"])
    const menu = await openSort()
    expect(
      within(menu)
        .getByRole("menuitemradio", { name: "Rank, best first" })
        .getAttribute("aria-checked")
    ).toBe("true")
  })

  it("puts the best ranked last on rank, best last, with an unranked model still after every ranked one", async () => {
    openPicker({ rows })
    await sortBy("Rank, best last")
    expect(shownIds()).toEqual(["c", "b", "a", "d", "e"])
  })

  it("orders by price both ways, with every unpriced model last in both", async () => {
    openPicker({ rows })
    await sortBy("Price, lowest first")
    expect(shownIds()).toEqual(["b", "d", "a", "c", "e"])
    await sortBy("Price, highest first")
    expect(shownIds()).toEqual(["a", "d", "b", "c", "e"])
  })

  it("keeps only open weights while Open weights only is on, in the order chosen, and every model when it is off", async () => {
    openPicker({ rows })
    await sortBy("Price, highest first")
    const menu = await openSort()
    const open = within(menu).getByRole("menuitemcheckbox", {
      name: "Open weights only",
    })
    fireEvent.click(open)
    expect(open.getAttribute("aria-checked")).toBe("true")
    expect(shownIds()).toEqual(["d", "b"])
    fireEvent.click(open)
    expect(shownIds()).toEqual(["a", "d", "b", "c", "e"])
  })

  it("offers no switch when no model has open weights", async () => {
    openPicker({ rows: [rowOf("a"), rowOf("b")] })
    const menu = await openSort()
    expect(within(menu).queryByRole("menuitemcheckbox")).toBeNull()
  })
})

describe("ModelPicker's Recent", () => {
  it("lists the three models you used last above All models, which still lists them", () => {
    openPicker({ rows, recent: ["d", "gone", "b", "e", "a"] })
    expect(shownIds("recent")).toEqual(["d", "b", "e"])
    expect(shownIds("all")).toEqual(["a", "b", "c", "d", "e"])
    const labels = [
      ...document.querySelectorAll("[data-slot='model-list-label']"),
    ].map((one) => one.textContent)
    expect(labels).toEqual(["Recent", "All models"])
  })

  it("obeys the search, and hides with its heading when nothing in it matches", () => {
    openPicker({ rows, recent: ["d", "b", "e"] })
    const search = screen.getByRole("searchbox", { name: "Search models" })
    fireEvent.change(search, { target: { value: "b" } })
    expect(shownIds("recent")).toEqual(["b"])
    expect(shownIds("all")).toEqual(["b"])
    fireEvent.change(search, { target: { value: "c" } })
    expect(shownIds("recent")).toEqual([])
    expect(shownIds("all")).toEqual(["c"])
    expect(document.querySelector("[data-slot='model-list-label']")).toBeNull()
  })

  it("obeys the switch", async () => {
    openPicker({ rows, recent: ["e", "d", "c", "b"] })
    const menu = await openSort()
    fireEvent.click(
      within(menu).getByRole("menuitemcheckbox", { name: "Open weights only" })
    )
    expect(shownIds("recent")).toEqual(["d", "b"])
  })

  it("hides when no model you used is listed", () => {
    openPicker({ rows, recent: ["gone"] })
    expect(document.querySelector("[data-section='recent']")).toBeNull()
    expect(shownIds("all")).toEqual(["a", "b", "c", "d", "e"])
  })
})
