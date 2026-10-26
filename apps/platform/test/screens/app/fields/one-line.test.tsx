import { fieldInset, Input } from "@rosesfield/ui/components/input"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { SwitchRow } from "@/screens/app/fields/toggle-field"

afterEach(cleanup)

const startInset = /^(p|px|ps|pl)-/

function startInsetOf(element: Element | null): string[] {
  return (element?.className ?? "")
    .split(" ")
    .filter((one) => startInset.test(one))
}

function renderColumn(): void {
  render(
    <div data-slot="column">
      <FieldFrame
        caption="Script"
        isOptional={false}
        note={null}
        problem={undefined}
      >
        <Input aria-label="Script" />
      </FieldFrame>
      <ChoiceField
        label="Resolution"
        setting="resolution"
        items={[
          { value: "480p", label: "480p" },
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
        ]}
        value="480p"
        onChange={() => undefined}
        note={null}
      />
      <ChoiceField
        label="Flavour"
        setting="flavour"
        items={[
          { value: "sweet", label: "Sweet" },
          { value: "sour", label: "Sour" },
          { value: "salt", label: "Salt" },
        ]}
        value="sweet"
        onChange={() => undefined}
        note={null}
      />
      <ModelChip name="Picture 2" mark={<svg />} width="full" />
      <SwitchRow
        label="Sound"
        checked={true}
        onCheckedChange={() => undefined}
      />
    </div>
  )
}

describe("A column's fields on one line", () => {
  it("start every label, typed text, dropdown icon and model mark at the one field inset", () => {
    renderColumn()
    const expected = fieldInset.split(" ").filter((one) => startInset.test(one))
    expect(expected).toHaveLength(1)
    const lead = [
      screen.getByRole("textbox", { name: "Script" }),
      screen.getByRole("combobox", { name: "Resolution" }),
      screen.getByRole("combobox", { name: "Flavour" }),
      screen.getByRole("button", { name: "Picture 2" }),
      ...document.querySelectorAll("[data-slot='field-caption']"),
      document.querySelector("[data-slot='switch-row']"),
    ]
    expect(lead).toHaveLength(8)
    for (const element of lead) {
      expect(startInsetOf(element)).toEqual(expected)
    }
  })

  it("puts each dropdown's icon and the model's mark first in their field, so nothing sits before them on the line", () => {
    renderColumn()
    for (const name of ["Resolution", "Flavour"]) {
      const trigger = screen.getByRole("combobox", { name })
      const first = trigger.firstElementChild
      expect(first?.getAttribute("data-slot")).toBe("select-lead")
      expect(first?.querySelector("svg")).not.toBeNull()
    }
    const chip = screen.getByRole("button", { name: "Picture 2" })
    expect(chip.firstElementChild?.getAttribute("data-slot")).toBe(
      "model-row-mark"
    )
  })

  it("shows a known setting's own icon and the one shared icon for a setting the registry does not name", () => {
    renderColumn()
    const iconOf = (name: string): string =>
      screen
        .getByRole("combobox", { name })
        .querySelector("[data-slot='select-lead'] svg")
        ?.getAttribute("class") ?? ""
    expect(iconOf("Resolution")).toContain("lucide-gem")
    expect(iconOf("Flavour")).toContain("lucide-tag")
  })
})
