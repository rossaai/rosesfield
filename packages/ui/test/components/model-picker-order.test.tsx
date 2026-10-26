import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

const filters = {
  order: "Order by",
  top: "Top",
  newest: "Newest",
  price: "Price",
  lastUsed: "Last used",
  open: "Open weights",
}

function rowOf(
  id: string,
  change: Partial<ModelPickerRow> = {}
): ModelPickerRow {
  return { id, name: id.toUpperCase(), maker: "lab", tags: [], ...change }
}

const topOrder: ModelPickerSection[] = [
  {
    id: "all",
    label: "All",
    rows: [
      rowOf("a", { released: "2026-01-02", cost: 30 }),
      rowOf("b", { isOpen: true, cost: 5 }),
      rowOf("c", { released: "2026-09-01" }),
      rowOf("d", { released: "2026-05-01", cost: 12, isOpen: true }),
    ],
  },
]

function open(recent: readonly string[] = [], isPricing = false): void {
  render(
    <ModelPicker
      trigger={<Chip>Model</Chip>}
      title="Model"
      searchLabel="Search models"
      searchPlaceholder="Search by name or maker"
      emptyLabel="No model matches"
      sections={topOrder}
      chosen={null}
      onChoose={() => undefined}
      filters={filters}
      recent={recent}
      isPricing={isPricing}
      open
    />
  )
}

function names(): string[] {
  return screen.getAllByRole("option").map((row) => row.dataset.model ?? "")
}

describe("ModelPicker's order", () => {
  it("opens on Top, the order the rows arrive in", () => {
    open(["c"])
    expect(
      screen.getByRole("radio", { name: "Top" }).getAttribute("aria-checked")
    ).toBe("true")
    expect(names()).toEqual(["a", "b", "c", "d"])
  })

  it("orders by release on Newest, newest first, with an undated model after in Top order", () => {
    open()
    fireEvent.click(screen.getByRole("radio", { name: "Newest" }))
    expect(names()).toEqual(["c", "d", "a", "b"])
  })

  it("orders by price on Price, low to high, with an unpriced model after", () => {
    open()
    fireEvent.click(screen.getByRole("radio", { name: "Price" }))
    expect(names()).toEqual(["b", "d", "a", "c"])
  })

  it("puts the models of your recent runs first on Last used, newest run first, then the rest by Top", () => {
    open(["d", "gone", "b"])
    fireEvent.click(screen.getByRole("radio", { name: "Last used" }))
    expect(names()).toEqual(["d", "b", "a", "c"])
  })

  it("offers only the orders the rows can follow: no Last used with no run, and Price while the prices load", () => {
    open([], true)
    const offered = screen
      .getAllByRole("radio")
      .map((one) => one.getAttribute("aria-label") ?? one.textContent)
    expect(offered).toEqual(["Top", "Newest", "Price"])
  })

  it("keeps only open weights while the Open weights filter is pressed, in the order chosen", () => {
    open()
    const filter = screen.getByRole("button", { name: "Open weights" })
    fireEvent.click(screen.getByRole("radio", { name: "Price" }))
    fireEvent.click(filter)
    expect(filter.getAttribute("aria-pressed")).toBe("true")
    expect(names()).toEqual(["b", "d"])
    fireEvent.click(filter)
    expect(names()).toEqual(["b", "d", "a", "c"])
  })
})
