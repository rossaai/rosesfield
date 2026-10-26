import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { HashIcon } from "lucide-react"
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
        icon={<HashIcon />}
        onChange={change}
      />
    </TooltipProvider>
  )
  return change
}

afterEach(cleanup)

describe("NumberStepper", () => {
  it("leads with its setting's icon at the field inset, the value after it, as a dropdown does", () => {
    renderStepper(2)
    const stepper = screen.getByRole("group", { name: "Count" })
    expect(stepper.className).toContain("ps-s5")
    const lead = stepper.firstElementChild
    expect(lead?.getAttribute("data-slot")).toBe("stepper-lead")
    expect(lead?.querySelector("svg")).not.toBeNull()
    expect(lead?.nextElementSibling?.tagName).toBe("OUTPUT")
  })

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
