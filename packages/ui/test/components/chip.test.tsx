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
