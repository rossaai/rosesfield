import { Button, IconButton } from "@rosesfield/ui/components/button"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("Button", () => {
  it("runs its act when pressed", () => {
    const press = vi.fn()
    render(<Button onClick={press}>Generate</Button>)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(press).toHaveBeenCalledTimes(1)
  })

  it("keeps its name and takes no press while busy", () => {
    const press = vi.fn()
    render(
      <Button busy onClick={press}>
        Generate
      </Button>
    )
    const button = screen.getByRole("button", { name: "Generate" })
    fireEvent.click(button)
    expect(press).not.toHaveBeenCalled()
    expect(button.getAttribute("aria-busy")).toBe("true")
  })
})

describe("IconButton", () => {
  it("sits in a circle on its ground's well when quiet", () => {
    render(
      <IconButton label="Open the menu" tone="quiet">
        <svg aria-hidden="true" />
      </IconButton>
    )
    const classes = screen
      .getByRole("button", { name: "Open the menu" })
      .className.split(" ")
    expect(classes).toContain("bg-(--well)")
    expect(classes).toContain("rounded-full")
    expect(classes).not.toContain("bg-transparent")
  })
})
