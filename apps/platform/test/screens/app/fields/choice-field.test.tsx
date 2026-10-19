import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ChoiceField } from "@/screens/app/fields/choice-field"

const items = [
  { value: "keep", label: "As in the photo" },
  { value: "plain", label: "A plain top" },
  { value: "shirt", label: "A collared shirt" },
]

function measureLabels(labelWidth: number, segmentWidth: number): void {
  const isLabel = (element: HTMLElement): boolean =>
    element.dataset.slot === "segment-label"
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return isLabel(this) ? labelWidth : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return isLabel(this) ? segmentWidth : 300
    },
  })
}

function renderChoice(): void {
  render(
    <ChoiceField
      label="Clothes"
      items={items}
      value="keep"
      onChange={() => undefined}
      note={null}
    />
  )
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth")
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth")
})

describe("ChoiceField with two to four values", () => {
  it("keeps the segmented control while every label fits its segment", () => {
    measureLabels(60, 80)
    renderChoice()
    expect(screen.getByRole("radiogroup", { name: "Clothes" })).toBeTruthy()
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("falls back to a select when a label overflows its segment", () => {
    measureLabels(120, 80)
    renderChoice()
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(screen.getByRole("combobox", { name: "Clothes" })).toBeTruthy()
  })
})
