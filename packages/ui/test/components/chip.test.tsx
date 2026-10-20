import { Chip } from "@rosesfield/ui/components/chip"
import { cleanup, render, screen } from "@testing-library/react"
import { ProportionsIcon } from "lucide-react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("Chip", () => {
  it("holds its icon beside the value, hidden from the accessible name", () => {
    render(<Chip icon={<ProportionsIcon data-testid="icon" />}>16:9</Chip>)
    const button = screen.getByRole("button", { name: "16:9" })
    const icon = screen.getByTestId("icon")
    expect(button.contains(icon)).toBe(true)
    expect(icon.closest("[aria-hidden='true']")).not.toBeNull()
  })

  it("shows no icon slot without an icon", () => {
    render(<Chip>16:9</Chip>)
    expect(
      screen
        .getByRole("button", { name: "16:9" })
        .querySelector("[data-slot='chip-icon']")
    ).toBeNull()
  })
})

describe("Chip sizes", () => {
  it("stands 32 px tall in a bar and 26 px tall inside a prompt block", () => {
    render(
      <>
        <Chip>Aspect</Chip>
        <Chip size="inline">Sound</Chip>
      </>
    )
    const bar = screen.getByRole("button", { name: "Aspect" })
    const inline = screen.getByRole("button", { name: "Sound" })
    expect(bar.className.split(" ")).toContain("h-8")
    expect(inline.className.split(" ")).toEqual(
      expect.arrayContaining(["h-6.5", "px-2"])
    )
    expect(inline.className.split(" ")).not.toContain("h-8")
  })
})
