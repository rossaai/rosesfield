import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NumberStepper } from "@/pieces/number-stepper"

function renderStepper(value: number): ReturnType<typeof vi.fn> {
  const change = vi.fn()
  render(
    <TooltipProvider>
      <NumberStepper
        value={value}
        min={1}
        max={4}
        step={1}
        unit=""
        label="Count"
        onChange={change}
      />
    </TooltipProvider>
  )
  return change
}

afterEach(cleanup)

describe("NumberStepper", () => {
  it("steps up and down by its step", () => {
    const change = renderStepper(2)
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    fireEvent.click(screen.getByRole("button", { name: "Decrease" }))
    expect(change.mock.calls).toEqual([[3], [1]])
  })

  it("stops at its bounds", () => {
    renderStepper(4)
    expect(screen.getByRole("button", { name: "Increase" })).toHaveProperty(
      "disabled",
      true
    )
    cleanup()
    renderStepper(1)
    expect(screen.getByRole("button", { name: "Decrease" })).toHaveProperty(
      "disabled",
      true
    )
  })
})
