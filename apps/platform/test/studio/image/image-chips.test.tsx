import type { ModelField } from "@rosesfield/catalog/comfy"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { FieldValue } from "@/screens/app/app-form"
import { FieldChoiceChip } from "@/screens/app/hosted/field-chip"
import type { AppForm } from "@/screens/app/use-app-form"

type ChoiceField = Extract<ModelField, { kind: "choice" }>

const quality: ChoiceField = {
  name: "quality",
  path: "quality",
  required: false,
  kind: "choice",
  options: ["low", "medium", "high"],
  default: null,
}

function formWith(inputs: Record<string, FieldValue>): AppForm {
  return {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: null },
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

afterEach(cleanup)

describe("a choice chip on the Image bar", () => {
  it("shows its value only, with a gem for quality and the setting's name as its accessible name", () => {
    const shown = (): string | null | undefined =>
      screen.getByRole("combobox").querySelector('[data-slot="select-value"]')
        ?.textContent
    render(<FieldChoiceChip field={quality} form={formWith({})} />)
    expect(shown()).toBe("Not set")
    const chip = screen.getByRole("combobox")
    expect(
      chip.querySelector("[data-slot='chip-icon'] .lucide-gem")
    ).not.toBeNull()
    expect(chip.querySelector(".sr-only")?.textContent).toBe("Quality ")
    cleanup()
    render(
      <FieldChoiceChip field={quality} form={formWith({ quality: "low" })} />
    )
    expect(shown()).toBe("low")
  })
})
