import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("ChipSelect", () => {
  it("names its combobox by its label, so a reader and a test find the setting it sets", () => {
    render(
      <TooltipProvider>
        <ChipSelect
          label="Format"
          icon={<svg data-testid="format-icon" />}
          value="1:1"
          onValueChange={() => undefined}
          options={[
            { value: "1:1", label: "1:1", icon: <svg /> },
            { value: "16:9", label: "16:9", icon: <svg /> },
          ]}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole("combobox", { name: "Format" })).toBeDefined()
  })

  it("keeps the check mark's room on every option and widens a menu whose options carry a description", async () => {
    render(
      <TooltipProvider>
        <ChipSelect
          label="Run mode"
          icon={<svg />}
          value="auto"
          onValueChange={() => undefined}
          options={[
            {
              value: "auto",
              label: "Auto",
              icon: <svg />,
              description:
                "Ask above 211 credits or when the price is not certain",
            },
            {
              value: "ask",
              label: "Manual",
              icon: <svg />,
              description: "Ask before each run",
            },
          ]}
        />
      </TooltipProvider>
    )
    fireEvent.click(screen.getByRole("combobox", { name: "Run mode" }))
    const menu = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot='select-content']"
      )
      if (found === null) {
        throw new Error("no menu")
      }
      return found
    })
    expect(menu.className.split(" ")).toContain("w-64")
    for (const option of menu.querySelectorAll("[data-slot='select-item']")) {
      const classes = option.className.split(" ")
      expect(classes).toContain("pe-s12")
      expect(classes).not.toContain("px-2")
    }
  })

  it("keeps its words at every size and never shrinks, so a full chip row scrolls instead of cutting it", () => {
    render(
      <TooltipProvider>
        <ChipSelect
          label="Effort"
          icon={<svg />}
          value="high"
          display="High"
          onValueChange={() => undefined}
          options={[
            { value: "high", label: "High", icon: null },
            { value: "low", label: "Low", icon: null },
          ]}
        />
      </TooltipProvider>
    )
    const chip = screen.getByRole("combobox", { name: "Effort" })
    const classes = chip.className.split(" ")
    expect(classes).toContain("shrink-0")
    expect(classes).not.toContain("shrink")
    expect(chip.className).not.toContain("@max-regular:")
    const value = chip.querySelector("[data-slot='select-value']")
    expect(value?.textContent).toBe("High")
    expect(value?.className ?? "").not.toContain("hidden")
  })
})
