import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ChoiceField } from "@/screens/app/fields/choice-field"

afterEach(cleanup)

function openChoice(
  setting: string,
  items: { value: string; label: string }[],
  value: string
): HTMLElement {
  render(
    <ChoiceField
      label={setting}
      setting={setting}
      items={items}
      value={value}
      onChange={() => undefined}
      note={null}
    />
  )
  const trigger = screen.getByRole("combobox", { name: setting })
  fireEvent.click(trigger)
  return trigger
}

function iconOf(element: Element | null): string {
  return element?.querySelector("svg")?.getAttribute("class") ?? ""
}

function optionIcons(): string[] {
  return screen
    .getAllByRole("option")
    .map((option) =>
      iconOf(option.querySelector("[data-slot='select-item-icon']"))
    )
}

describe("a dropdown's options", () => {
  it("draw each option's own icon beside its words, outside the words, so both sit on one line", () => {
    openChoice(
      "color",
      [
        { value: "warm", label: "Warm" },
        { value: "cool", label: "Cool" },
      ],
      "warm"
    )
    const options = screen.getAllByRole("option")
    for (const option of options) {
      const icon = option.querySelector("[data-slot='select-item-icon']")
      expect(icon?.querySelector("svg")).not.toBeNull()
      expect(icon?.nextElementSibling?.textContent).toBe(option.textContent)
    }
    expect(optionIcons()).toEqual([
      expect.stringContaining("lucide-flame"),
      expect.stringContaining("lucide-snowflake"),
    ])
  })

  it("draw the setting's icon on an option with no icon of its own, as the field does", () => {
    const trigger = openChoice(
      "topology",
      [
        { value: "quad", label: "Quad" },
        { value: "triangle", label: "Triangle" },
      ],
      "triangle"
    )
    const lead = iconOf(trigger.querySelector("[data-slot='select-lead']"))
    expect(lead).toContain("lucide-triangle")
    expect(optionIcons()).toEqual([lead, lead])
  })

  it("draw on Auto the icon the field shows once Auto is chosen", () => {
    const trigger = openChoice(
      "color",
      [
        { value: "auto", label: "Auto" },
        { value: "warm", label: "Warm" },
      ],
      "auto"
    )
    const lead = iconOf(trigger.querySelector("[data-slot='select-lead']"))
    expect(optionIcons()[0]).toBe(lead)
  })
})
