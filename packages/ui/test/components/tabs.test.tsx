import {
  ModeStrip,
  ModeTab,
  SegmentedTab,
  SegmentedTabs,
  Tabs,
} from "@rosesfield/ui/components/tabs"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function classesOf(element: Element): string[] {
  return element.className.split(" ")
}

describe("ModeStrip", () => {
  it("holds text tabs 36 px tall and 12 px apart, the current one underlined, changing at once", () => {
    render(
      <Tabs defaultValue="video">
        <ModeStrip aria-label="Mode">
          <ModeTab value="video">Create video</ModeTab>
          <ModeTab value="edit">Edit video</ModeTab>
        </ModeStrip>
      </Tabs>
    )
    const strip = screen.getByRole("tablist", { name: "Mode" })
    expect(classesOf(strip)).toEqual(
      expect.arrayContaining([
        "gap-3",
        "-m-[calc(var(--spacing-focus-ring)*2)]",
        "p-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
    const edit = screen.getByRole("tab", { name: "Edit video" })
    expect(classesOf(edit)).toEqual(
      expect.arrayContaining(["h-9", "border-b-2", "transition-none"])
    )
    expect(edit.getAttribute("aria-selected")).toBe("false")
    fireEvent.click(edit)
    expect(edit.getAttribute("aria-selected")).toBe("true")
    expect(
      screen
        .getByRole("tab", { name: "Create video" })
        .getAttribute("aria-selected")
    ).toBe("false")
  })
})

describe("SegmentedTabs", () => {
  it("holds 32 px cells 4 px apart over a plate of its own that jumps", () => {
    render(
      <Tabs defaultValue="how">
        <SegmentedTabs aria-label="View">
          <SegmentedTab value="history" icon={<svg data-testid="icon" />}>
            History
          </SegmentedTab>
          <SegmentedTab value="how">How it works</SegmentedTab>
        </SegmentedTabs>
      </Tabs>
    )
    const list = screen.getByRole("tablist", { name: "View" })
    expect(classesOf(list)).toContain("gap-1")
    const history = screen.getByRole("tab", { name: "History" })
    expect(classesOf(history)).toEqual(
      expect.arrayContaining(["h-8", "gap-1", "[&_svg]:size-4", "z-1"])
    )
    const plate = list.querySelector("[data-slot='segmented-control-thumb']")
    expect(plate?.className.split(" ")).toContain("transition-none")
    expect(
      screen
        .getByRole("tab", { name: "How it works" })
        .getAttribute("aria-selected")
    ).toBe("true")
  })
})

describe("SegmentedTabs on a well", () => {
  it("sits on a 36 px well with 2 px padding and puts the current cell on a 30 px plate inset 1 px", () => {
    render(
      <Tabs defaultValue="list">
        <SegmentedTabs form="well" aria-label="View">
          <SegmentedTab value="list">List</SegmentedTab>
          <SegmentedTab value="grid">Grid</SegmentedTab>
        </SegmentedTabs>
      </Tabs>
    )
    const list = screen.getByRole("tablist", { name: "View" })
    expect(list.getAttribute("data-form")).toBe("well")
    expect(classesOf(list)).toEqual(
      expect.arrayContaining(["h-9", "p-0.5", "gap-1", "rounded-dense"])
    )
    const plate = list.querySelector("[data-slot='segmented-control-thumb']")
    expect(plate?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-tab",
        "top-[calc(var(--active-tab-top)+var(--spacing-hairline))]",
        "transition-none",
      ])
    )
    const grid = screen.getByRole("tab", { name: "Grid" })
    expect(grid.getAttribute("tabindex")).toBe("-1")
    fireEvent.click(grid)
    expect(grid.getAttribute("aria-selected")).toBe("true")
  })
})
