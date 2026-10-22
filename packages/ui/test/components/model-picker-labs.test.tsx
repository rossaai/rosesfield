import { Chip } from "@rosesfield/ui/components/chip"
import {
  labSectionsOf,
  ModelPicker,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
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

function groupsShown(): (string | null)[] {
  return screen
    .getAllByRole("group")
    .map((group) => group.getAttribute("aria-label"))
}

describe("ModelPicker's labs", () => {
  it("keeps the featured group first and whole, then groups every other row by its lab, leaving a featured model out of its lab", () => {
    open()
    expect(groupsShown()).toEqual(["Featured", "Alpha Lab", "Beta"])
    const alpha = screen.getByRole("group", { name: "Alpha Lab" })
    expect(
      within(alpha)
        .getAllByRole("option")
        .map((one) => one.dataset.model)
    ).toEqual(["alpha/two", "alpha/four"])
  })

  it("heads each lab with its name alone, and the featured group with the sparkle", () => {
    open()
    const heading = (name: string) =>
      screen
        .getByRole("group", { name })
        .querySelector("[data-slot='model-section-heading']")
    expect(heading("Alpha Lab")?.querySelector("svg")).toBeNull()
    expect(heading("Alpha Lab")?.textContent).toBe("Alpha Lab")
    expect(heading("Featured")?.querySelector("svg")).not.toBeNull()
  })

  it("lists each model once, with exactly one check on the chosen row", () => {
    open(false, "zeta/one")
    const ids = screen.getAllByRole("option").map((one) => one.dataset.model)
    expect(new Set(ids).size).toBe(ids.length)
    const checks = document.querySelectorAll(
      "[data-slot='model-row-check'] svg"
    )
    expect(checks).toHaveLength(1)
    const chosen = rowOf("Zeta One, 14.48 Comfy credits")
    expect(chosen.getAttribute("data-ground")).toBe("surface")
    expect(
      chosen.querySelector("[data-slot='model-row-mark']")?.className
    ).toContain("bg-(--well)")
  })

  it("lists a model once in its lab when two groups both hold it", () => {
    const sections = labSectionsOf([
      { id: "all", label: "All", rows: byLab[1]?.rows ?? [] },
      { id: "again", label: "Again", rows: byLab[1]?.rows ?? [] },
    ])
    expect(sections.flatMap((one) => one.rows.map((row) => row.id))).toEqual([
      "alpha/two",
      "beta/three",
      "zeta/one",
    ])
    const withFeatured = labSectionsOf(byLab)
    const listed = withFeatured.flatMap((one) => one.rows.map((row) => row.id))
    expect(listed.filter((id) => id === "zeta/one")).toHaveLength(1)
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
