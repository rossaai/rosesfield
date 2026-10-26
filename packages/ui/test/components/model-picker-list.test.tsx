import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

const byLab: ModelPickerSection[] = [
  {
    id: "featured",
    label: "Featured",
    rows: [
      {
        id: "zeta/one",
        name: "Zeta One",
        maker: "Zeta",
        tags: [],
        mark: <svg data-testid="zeta-mark" aria-hidden="true" />,
        price: { amount: "14.48", name: "14.48 Comfy credits" },
      },
    ],
  },
  {
    id: "all",
    label: "All",
    rows: [
      {
        id: "zeta/one",
        name: "Zeta One",
        maker: "Zeta",
        tags: [],
        mark: <svg data-testid="zeta-mark" aria-hidden="true" />,
        price: { amount: "14.48", name: "14.48 Comfy credits" },
      },
      {
        id: "alpha/two",
        name: "Alpha Two",
        maker: "alpha",
        lab: "Alpha Lab",
        tags: [],
        mark: <svg data-testid="alpha-mark" aria-hidden="true" />,
      },
      {
        id: "beta/three",
        name: "Beta Three",
        maker: "Beta",
        tags: [],
      },
    ],
  },
  {
    id: "open",
    label: "Open weights",
    rows: [
      {
        id: "alpha/four",
        name: "Alpha Four",
        maker: "alpha",
        lab: "Alpha Lab",
        tags: [],
        mark: <svg data-testid="alpha-mark" aria-hidden="true" />,
      },
    ],
  },
]

function rowOf(name: string): HTMLElement {
  const row = screen
    .getByRole("option", { name })
    .closest<HTMLElement>("[data-slot='model-row']")
  if (row === null) {
    throw new Error(`no row for ${name}`)
  }
  return row
}

function open(isPricing = false, chosen: string | null = null) {
  render(
    <ModelPicker
      trigger={<Chip>Zeta One</Chip>}
      title="Model"
      searchLabel="Search models"
      searchPlaceholder="Search by name or maker"
      emptyLabel="No model matches"
      sections={byLab}
      chosen={chosen}
      onChoose={() => undefined}
      isPricing={isPricing}
      open
    />
  )
}

afterEach(cleanup)

describe("ModelPicker's list", () => {
  it("lists every model once in the order its sections give, with no group heading", () => {
    open()
    expect(
      screen.getAllByRole("option").map((one) => one.dataset.model)
    ).toEqual(["zeta/one", "alpha/two", "beta/three", "alpha/four"])
    expect(screen.queryAllByRole("group")).toEqual([])
    expect(
      document.querySelector("[data-slot='model-section-heading']")
    ).toBeNull()
  })

  it("puts exactly one check on the chosen row", () => {
    open(false, "alpha/two")
    const checked = screen
      .getAllByRole("option")
      .filter((one) => one.getAttribute("aria-selected") === "true")
    expect(checked.map((one) => one.dataset.model)).toEqual(["alpha/two"])
  })

  it("finds a row by its lab's name", () => {
    open()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search models" }), {
      target: { value: "alpha lab" },
    })
    expect(
      screen.getAllByRole("option").map((one) => one.dataset.model)
    ).toEqual(["alpha/two", "alpha/four"])
  })
})

describe("ModelPicker's prices", () => {
  it("shows a priced row's credits at its end and names them with the model, and shows nothing for a row with no price", () => {
    open()
    const zeta = screen.getByRole("option", {
      name: "Zeta One, 14.48 Comfy credits",
    })
    const row = zeta.closest<HTMLElement>("[data-slot='model-row']")
    expect(row?.querySelector("[data-slot='credit-price']")?.textContent).toBe(
      "14.48"
    )
    expect(
      rowOf("Beta Three").querySelector("[data-slot='credit-price']")
    ).toBeNull()
    expect(rowOf("Beta Three").textContent).not.toMatch(/unknown/i)
    expect(
      rowOf("Beta Three")
        .querySelector("[data-slot='model-row-price']")
        ?.getAttribute("data-state")
    ).toBe("none")
  })

  it("holds a skeleton where a price will show while the prices load, the control", () => {
    open(true)
    expect(
      rowOf("Beta Three").querySelector("[data-slot='model-row-price-loading']")
    ).not.toBeNull()
    const slots = ["Beta Three", "Alpha Two"].map((name) =>
      rowOf(name).querySelector("[data-slot='model-row-price']")
    )
    for (const slot of slots) {
      expect(slot?.className.split(" ")).toContain(
        "w-[calc(2*var(--spacing-s8))]"
      )
    }
    const zeta = screen
      .getByRole("option", { name: "Zeta One, 14.48 Comfy credits" })
      .closest<HTMLElement>("[data-slot='model-row']")
    expect(
      zeta?.querySelector("[data-slot='model-row-price-loading']")
    ).toBeNull()
  })
})
