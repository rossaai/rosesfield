import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("ModelPicker's filters", () => {
  const ranked: ModelPickerSection[] = [
    {
      id: "all",
      label: "All",
      rows: [
        {
          id: "a",
          name: "Alpha",
          maker: "lab",
          tags: [],
          rank: 3,
          released: "2026-01-02",
        },
        {
          id: "b",
          name: "Beta",
          maker: "lab",
          tags: [],
          rank: 1,
          isOpen: true,
        },
        {
          id: "c",
          name: "Gamma",
          maker: "lab",
          tags: [],
          released: "2026-09-01",
        },
      ],
    },
  ]

  function open(): void {
    render(
      <ModelPicker
        trigger={<Chip>Model</Chip>}
        title="Model"
        searchLabel="Search models"
        searchPlaceholder="Search by name or maker"
        emptyLabel="No model matches"
        sections={ranked}
        chosen={null}
        onChoose={() => undefined}
        filters={{
          featured: "Featured",
          top: "Top",
          newest: "New",
          open: "Open weights",
        }}
        open
      />
    )
  }

  function names(): string[] {
    return screen.getAllByRole("option").map((row) => row.dataset.model ?? "")
  }

  it("orders the rows by rank on Top, by release on New, and keeps only open weights on Open weights", () => {
    open()
    fireEvent.click(screen.getByRole("radio", { name: "Top" }))
    expect(names()).toEqual(["b", "a"])
    fireEvent.click(screen.getByRole("radio", { name: "New" }))
    expect(names()).toEqual(["c", "a"])
    fireEvent.click(screen.getByRole("radio", { name: "Open weights" }))
    expect(names()).toEqual(["b"])
  })
})
