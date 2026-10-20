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
