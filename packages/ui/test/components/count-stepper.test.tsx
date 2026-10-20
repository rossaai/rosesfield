import { CountStepper } from "@rosesfield/ui/components/count-stepper"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

function renderAt(value: number, change = vi.fn()) {
  render(
    <CountStepper
      value={value}
      max={4}
      onValueChange={change}
      label="Count"
      lessLabel="One fewer"
      moreLabel="One more"
    />
  )
  return change
}

describe("CountStepper", () => {
  it("disables the minus at 1 and shows the count over its maximum", () => {
    renderAt(1)
    const less = screen.getByRole("button", { name: "One fewer" })
    expect(less.hasAttribute("disabled")).toBe(true)
    expect(screen.getByRole("group", { name: "Count" }).textContent).toBe("1/4")
  })

  it("steps up and down by one inside its bounds", () => {
    const change = renderAt(2)
    fireEvent.click(screen.getByRole("button", { name: "One more" }))
    fireEvent.click(screen.getByRole("button", { name: "One fewer" }))
    expect(change.mock.calls).toEqual([[3], [1]])
  })

  it("disables the plus at its maximum", () => {
    renderAt(4)
    expect(
      screen.getByRole("button", { name: "One more" }).hasAttribute("disabled")
    ).toBe(true)
  })
})
