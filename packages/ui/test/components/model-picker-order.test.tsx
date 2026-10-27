import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  openBadge,
  openPicker,
  priceOf,
  rowOf,
  sectionIds,
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
  const shown = screen.queryAllByRole("menu")[0]
  if (shown !== undefined) {
    return shown
  }
  fireEvent.click(screen.getByRole("button", { name: "Sort and filter" }))
  return screen.findByRole("menu")
}

async function choose(row: string, option: string): Promise<void> {
  const menu = await openSort()
  const trigger = rowNamed(menu, row)
  if (trigger.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(trigger)
  }
  fireEvent.click(await screen.findByRole("menuitemradio", { name: option }))
}

function rowNamed(menu: HTMLElement, name: string): HTMLElement {
  return within(menu).getByRole("menuitem", { name: new RegExp(name) })
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
        .getAllByRole("menuitem")
        .map((one) => one.getAttribute("data-slot"))
    ).toEqual(["dropdown-menu-sub-trigger", "dropdown-menu-sub-trigger"])
    expect(within(menu).queryAllByRole("menuitemradio")).toEqual([])
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((one) => one.textContent)
    ).toEqual(["Sort byRank", "OrderHigh to low"])
    expect(
      within(menu).getByRole("menuitemcheckbox", { name: "Open weights only" })
    ).toBeTruthy()
  })
})

describe("ModelPicker's Sort menu", () => {
  it("opens on Rank, High to low, the order the rows arrive in, best first", async () => {
    openPicker({ rows })
    expect(shownIds()).toEqual(["a", "b", "c", "d", "e"])
    const menu = await openSort()
    expect(rowNamed(menu, "Sort by").textContent).toBe("Sort byRank")
    expect(rowNamed(menu, "Order").textContent).toBe("OrderHigh to low")
  })

  it("opens each row's options beside it with its current choice checked, and names the new choice once chosen", async () => {
    openPicker({ rows })
    const menu = await openSort()
    fireEvent.click(rowNamed(menu, "Sort by"))
    const rank = await screen.findByRole("menuitemradio", { name: "Rank" })
    expect(rank.getAttribute("aria-checked")).toBe("true")
    expect(
      screen
        .getByRole("menuitemradio", { name: "Price" })
        .getAttribute("aria-checked")
    ).toBe("false")
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Price" }))
    expect(rowNamed(await openSort(), "Sort by").textContent).toBe(
      "Sort byPrice"
    )
    fireEvent.click(rowNamed(await openSort(), "Order"))
    const down = await screen.findByRole("menuitemradio", {
      name: "High to low",
    })
    expect(down.getAttribute("aria-checked")).toBe("true")
    expect(
      screen
        .getByRole("menuitemradio", { name: "Low to high" })
        .getAttribute("aria-checked")
    ).toBe("false")
  })

  it("leads Sort by with the up and down arrows, Order with the wide to narrow arrows and the switch with the Hugging Face mark, all in one lead slot", async () => {
    openPicker({ rows })
    const menu = await openSort()
    const leadOf = (row: HTMLElement): Element | null =>
      row.firstElementChild?.getAttribute("data-slot") === "dropdown-menu-lead"
        ? row.firstElementChild
        : null
    const open = within(menu).getByRole("menuitemcheckbox", {
      name: "Open weights only",
    })
    expect(
      leadOf(rowNamed(menu, "Sort by"))?.querySelector(".lucide-arrow-up-down")
    ).toBeTruthy()
    expect(
      leadOf(rowNamed(menu, "Order"))?.querySelector(
        ".lucide-arrow-down-wide-narrow"
      )
    ).toBeTruthy()
    expect(
      leadOf(open)?.querySelector("[data-slot='hugging-face-mark']")
    ).toBeTruthy()
  })

  it("puts the best ranked last on Rank, Low to high, with an unranked model still after every ranked one", async () => {
    openPicker({ rows })
    await choose("Order", "Low to high")
    expect(shownIds()).toEqual(["c", "b", "a", "d", "e"])
    await choose("Order", "High to low")
    expect(shownIds()).toEqual(["a", "b", "c", "d", "e"])
  })

  it("puts the cheapest first on Price, Low to high, the dearest first on High to low, and every unpriced model last in both", async () => {
    openPicker({ rows })
    await choose("Sort by", "Price")
    expect(shownIds()).toEqual(["a", "d", "b", "c", "e"])
    await choose("Order", "Low to high")
    expect(shownIds()).toEqual(["b", "d", "a", "c", "e"])
  })

  it("keeps only open weights while Open weights only is on, in the order chosen, and every model when it is off", async () => {
    openPicker({ rows })
    await choose("Sort by", "Price")
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

const value = { kind: "value", label: "Best value" } as const

const fillers = [7, 8, 9, 10, 11, 12].map((place) =>
  rowOf(`f${place}`, { rank: rank(place) })
)

const featuring = [
  rowOf("top", { rank: rank(1), price: priceOf(30) }),
  rowOf("same", { rank: rank(2), price: priceOf(29.5), badges: [value] }),
  rowOf("mid", { rank: rank(3), price: priceOf(5), badges: [openBadge] }),
  rowOf("low", { rank: rank(4), price: priceOf(1) }),
  rowOf("o5", { rank: rank(5), price: priceOf(2), badges: [openBadge] }),
  rowOf("o6", { rank: rank(6), price: priceOf(1), badges: [openBadge] }),
  ...fillers,
  rowOf("u", { price: priceOf(0.5) }),
]

const featuringIds = featuring.map((row) => row.id)

function labels(): (string | null)[] {
  return [...document.querySelectorAll("[data-slot='model-list-label']")].map(
    (one) => one.textContent
  )
}

function valued(section: string): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      `[data-section='${section}'] [data-slot='model-row']`
    ),
  ]
    .filter((row) => row.textContent?.includes("Best value") === true)
    .map(
      (row) =>
        row.querySelector<HTMLElement>("[data-model]")?.dataset.model ?? ""
    )
}

describe("ModelPicker's Featured", () => {
  it("holds the Pareto line of the top quarter, best ranked first and each cheaper than every model above it, above All models, which still lists them, and no other section", () => {
    openPicker({ rows: featuring })
    expect(shownIds("featured")).toEqual(["top", "mid"])
    expect(shownIds("all")).toEqual(featuringIds)
    expect(labels()).toEqual(["Featured", "All models"])
    expect(sectionIds()).toEqual(["featured", "all"])
  })

  it("leaves out a model at the same whole price as a better ranked one, and a cheaper model below the top quarter", () => {
    openPicker({ rows: featuring })
    expect(shownIds("featured")).not.toContain("same")
    expect(shownIds("featured")).not.toContain("low")
    expect(shownIds("featured")).not.toContain("u")
  })

  it("marks Best value on the line's models in both sections and on no other, whatever badge a row brings", () => {
    openPicker({ rows: featuring })
    expect(valued("featured")).toEqual(["top", "mid"])
    expect(valued("all")).toEqual(["top", "mid"])
  })

  it("keeps its rank order whatever Sort holds, while All models follows the chosen order", async () => {
    openPicker({ rows: featuring })
    await choose("Sort by", "Price")
    await choose("Order", "Low to high")
    expect(shownIds("featured")).toEqual(["top", "mid"])
    expect(shownIds("all").slice(0, 3)).toEqual(["u", "low", "o6"])
  })

  it("obeys the search, and hides with its heading when nothing in it matches", () => {
    openPicker({ rows: featuring })
    const search = screen.getByRole("searchbox", { name: "Search models" })
    fireEvent.change(search, { target: { value: "mid" } })
    expect(shownIds("featured")).toEqual(["mid"])
    expect(shownIds("all")).toEqual(["mid"])
    fireEvent.change(search, { target: { value: "low" } })
    expect(shownIds("featured")).toEqual([])
    expect(shownIds("all")).toEqual(["low"])
    expect(labels()).toEqual([])
  })

  it("computes the line over the open models alone under Open weights only", async () => {
    openPicker({ rows: featuring })
    const menu = await openSort()
    fireEvent.click(
      within(menu).getByRole("menuitemcheckbox", { name: "Open weights only" })
    )
    expect(shownIds("featured")).toEqual(["mid"])
    expect(shownIds("all")).toEqual(["mid", "o5", "o6"])
  })

  it("hides when no model is ranked and priced", () => {
    openPicker({ rows: [rowOf("a", { rank: rank(1) }), rowOf("b")] })
    expect(sectionIds()).toEqual(["all"])
    expect(labels()).toEqual([])
  })
})
