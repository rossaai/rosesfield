import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function renderSheet(): void {
  render(
    <Sheet open={true}>
      <SheetContent side="bottom" closeLabel="Close">
        <SheetTitle>Inputs</SheetTitle>
        <SheetBody>
          <button type="button">Add an image</button>
        </SheetBody>
        <SheetFooter>
          <button type="button">Generate</button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

describe("Sheet", () => {
  it("focuses the sheet itself, not its first control, when it opens without a key", async () => {
    renderSheet()
    const dialog = screen.getByRole("dialog")
    await waitFor(() => expect(document.activeElement).toBe(dialog))
    expect(document.activeElement).not.toBe(
      screen.getByRole("button", { name: "Add an image" })
    )
  })

  it("keeps the footer out of the scrolling body", () => {
    renderSheet()
    const body = screen
      .getByRole("button", { name: "Add an image" })
      .closest("[data-slot='sheet-body']")
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(body?.className).toContain("overflow-y-auto")
    expect(body?.contains(generate)).toBe(false)
    expect(generate.closest("[data-slot='sheet-footer']")?.className).toContain(
      "shrink-0"
    )
  })

  it("insets the bottom sheet and its body by the compact gutter", () => {
    renderSheet()
    const dialog = screen.getByRole("dialog")
    const body = dialog.querySelector("[data-slot='sheet-body']")
    expect(dialog.className.split(" ")).toContain("px-s5")
    expect(body?.className.split(" ")).toEqual(
      expect.arrayContaining(["-mx-s5", "px-s5"])
    )
  })
})
