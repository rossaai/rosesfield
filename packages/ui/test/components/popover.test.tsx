import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("PopoverContent", () => {
  it("never grows past the room its side leaves, and scrolls what does not fit", () => {
    render(
      <Popover open>
        <PopoverTrigger>Filter</PopoverTrigger>
        <PopoverContent aria-label="Filters">
          <p>Choices</p>
        </PopoverContent>
      </Popover>
    )
    const popup = screen
      .getByText("Choices")
      .closest("[data-slot='popover-content']")
    expect(popup?.className.split(" ")).toEqual(
      expect.arrayContaining(["max-h-(--available-height)", "overflow-y-auto"])
    )
  })
})

describe("PopoverContent's material", () => {
  it("wears the regular material by default and the thick one for a list panel", () => {
    render(
      <>
        <Popover open>
          <PopoverTrigger>Regular</PopoverTrigger>
          <PopoverContent>
            <p>Regular panel</p>
          </PopoverContent>
        </Popover>
        <Popover open>
          <PopoverTrigger>Thick</PopoverTrigger>
          <PopoverContent material="thick">
            <p>Thick panel</p>
          </PopoverContent>
        </Popover>
      </>
    )
    const regular = screen
      .getByText("Regular panel")
      .closest("[data-slot='popover-content']")
    const thick = screen
      .getByText("Thick panel")
      .closest("[data-slot='popover-content']")
    expect(regular?.className.split(" ")).toContain("material")
    expect(thick?.className.split(" ")).toContain("material-thick")
    expect(thick?.className.split(" ")).not.toContain("material")
    expect(thick?.className.split(" ")).toContain("motion-popover")
  })
})
