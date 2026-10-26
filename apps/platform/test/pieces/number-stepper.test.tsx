import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { HashIcon } from "lucide-react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NumberStepper } from "@/pieces/number-stepper"

function renderStepper(
  value: number,
  bounds: { min: number; max: number; step: number } = {
    min: 1,
    max: 4,
    step: 1,
  }
): ReturnType<typeof vi.fn> {
  const change = vi.fn()
  render(
    <TooltipProvider>
      <NumberStepper
        value={value}
        fallback={2}
        {...bounds}
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

function typeInto(text: string): HTMLInputElement {
  const field = screen.getByRole<HTMLInputElement>("spinbutton", {
    name: "Count",
  })
  fireEvent.focus(field)
  fireEvent.change(field, { target: { value: text } })
  return field
}

describe("NumberStepper", () => {
  it("leads with its setting's icon at the field inset, the value after it, as a dropdown does", () => {
    renderStepper(2)
    const stepper = screen.getByRole("group", { name: "Count" })
    expect(stepper.className).toContain("ps-s5")
    const lead = stepper.firstElementChild
    expect(lead?.getAttribute("data-slot")).toBe("stepper-lead")
    expect(lead?.querySelector("svg")).not.toBeNull()
    expect(lead?.nextElementSibling?.tagName).toBe("INPUT")
  })

  it("steps up and down by its step", () => {
    const change = renderStepper(2)
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    fireEvent.click(screen.getByRole("button", { name: "Decrease" }))
    expect(change.mock.calls).toEqual([[3], [1]])
  })

  it("commits a number you type when you press Enter", () => {
    const change = renderStepper(2)
    const field = typeInto("3")
    fireEvent.keyDown(field, { key: "Enter" })
    expect(change.mock.calls).toEqual([[3]])
  })

  it("commits a number you type when you leave the field", () => {
    const change = renderStepper(2)
    fireEvent.blur(typeInto("4"))
    expect(change.mock.calls).toEqual([[4]])
  })

  it("settles a number past a bound on that bound", () => {
    const change = renderStepper(2)
    fireEvent.keyDown(typeInto("40"), { key: "Enter" })
    fireEvent.keyDown(typeInto("-3"), { key: "Enter" })
    expect(change.mock.calls).toEqual([[4], [1]])
  })

  it("snaps a number off the step onto the step from the min", () => {
    const change = renderStepper(5, { min: 1, max: 20, step: 2 })
    fireEvent.keyDown(typeInto("6.2"), { key: "Enter" })
    expect(change.mock.calls).toEqual([[7]])
  })

  it("settles a number past a max that is off the step on the last step under it", () => {
    const change = renderStepper(5, { min: 1, max: 10, step: 2 })
    fireEvent.keyDown(typeInto("12"), { key: "Enter" })
    expect(change.mock.calls).toEqual([[9]])
  })

  it("shows its default as the placeholder when you clear it, and commits the default", () => {
    const change = renderStepper(4)
    const field = typeInto("")
    expect(field.getAttribute("placeholder")).toBe("2")
    fireEvent.blur(field)
    expect(change.mock.calls).toEqual([[2]])
  })

  it("keeps its value when the text is not a number", () => {
    const change = renderStepper(3)
    const field = typeInto("abc")
    fireEvent.blur(field)
    expect(change).not.toHaveBeenCalled()
    expect(field).toHaveProperty("value", "3")
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
