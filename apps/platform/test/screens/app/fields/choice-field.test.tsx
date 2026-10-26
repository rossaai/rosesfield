import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ChoiceField } from "@/screens/app/fields/choice-field"

const items = [
  { value: "keep", label: "Keep" },
  { value: "plain", label: "Plain top" },
  { value: "shirt", label: "Shirt" },
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
  it("draws three short options that fit as a dropdown, never a row of segments", () => {
    measureLabels(60, 80)
    renderChoice()
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(screen.getByRole("combobox", { name: "Clothes" })).toBeTruthy()
  })

  it("draws a two-option mode that means no on or off as a dropdown", () => {
    measureLabels(60, 80)
    render(
      <ChoiceField
        label="Mode"
        setting="mode"
        items={[
          { value: "split", label: "Split" },
          { value: "edit", label: "Edit" },
        ]}
        value="split"
        onChange={() => undefined}
        note={null}
      />
    )
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(screen.getByRole("combobox", { name: "Mode" })).toBeTruthy()
  })
})

describe("ChoiceField under the one control rule", () => {
  it("draws a choice whose labels run past the short limit as a select, before any measure", () => {
    measureLabels(10, 80)
    render(
      <ChoiceField
        label="Clothes"
        items={[
          { value: "keep", label: "As in the photo" },
          { value: "shirt", label: "A collared shirt" },
        ]}
        value="keep"
        onChange={() => undefined}
        note={null}
      />
    )
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(screen.getByRole("combobox", { name: "Clothes" })).toBeTruthy()
  })

  it("draws a choice of on and off as a switch with its name beside it, and sends the option it stands for", () => {
    measureLabels(10, 80)
    const sent: string[] = []
    render(
      <ChoiceField
        label="Sound"
        items={[
          { value: "true", label: "On" },
          { value: "false", label: "Off" },
        ]}
        value="false"
        onChange={(value) => sent.push(value)}
        note={null}
      />
    )
    expect(screen.queryByRole("radiogroup")).toBeNull()
    const toggle = screen.getByRole("switch", { name: "Sound" })
    toggle.click()
    expect(sent).toEqual(["true"])
  })
})
