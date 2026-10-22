import { Field, FieldCaption } from "@rosesfield/ui/components/field"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const items = [
  { value: "1-1", label: "1:1" },
  { value: "4-3", label: "4:3" },
  { value: "16-9", label: "16:9" },
]

function Format({
  onChange,
  density,
}: {
  onChange: (value: string) => void
  density?: "chrome" | "composer" | "row"
}) {
  const [value, setValue] = useState("1-1")
  return (
    <SegmentedControl
      label="Format"
      {...(density === undefined ? {} : { density })}
      items={items}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

function thumb(): HTMLElement {
  const element = screen
    .getByRole("radiogroup", { name: "Format" })
    .querySelector<HTMLElement>("[aria-hidden='true']")
  if (element === null) {
    throw new Error("no thumb")
  }
  return element
}

afterEach(cleanup)

describe("SegmentedControl", () => {
  it("reports the value of the cell you press", () => {
    const change = vi.fn()
    render(<Format onChange={change} />)
    fireEvent.click(screen.getByRole("radio", { name: "16:9" }))
    expect(change).toHaveBeenCalledWith("16-9")
  })

  it("names each cell by its own label inside a field with a caption", () => {
    const change = vi.fn()
    render(
      <Field>
        <FieldCaption>Size</FieldCaption>
        <Format onChange={change} />
      </Field>
    )
    const names = screen
      .getAllByRole("radio")
      .map((cell) => cell.getAttribute("aria-labelledby"))
      .map((id) => document.getElementById(id ?? "")?.textContent)
    expect(names).toEqual(["1:1", "4:3", "16:9"])
    fireEvent.click(screen.getByRole("radio", { name: "16:9" }))
    expect(change).toHaveBeenCalledWith("16-9")
  })

  it("moves the thumb under the chosen cell on the travel preset", () => {
    render(<Format onChange={() => undefined} />)
    expect(thumb().style.transform).toMatch(/^translateX\(calc\(0 \* /)
    expect(thumb().className.split(" ")).toContain("motion-travel")
    expect(thumb().className.split(" ")).not.toContain("transition-none")
    fireEvent.click(screen.getByRole("radio", { name: "16:9" }))
    expect(thumb().style.transform).toMatch(/^translateX\(calc\(2 \* /)
  })

  it("turns a chrome label to the thumb's ink on the thumb's own clock", () => {
    render(<Format onChange={() => undefined} />)
    const cell = screen.getByRole("radio", { name: "4:3" })
    expect(cell.className.split(" ")).toContain(
      "[transition:color_var(--travel)]"
    )
    cleanup()
    render(<Format onChange={() => undefined} density="row" />)
    expect(
      screen.getByRole("radio", { name: "4:3" }).className.split(" ")
    ).toContain("motion-tint")
  })

  it("insets the composer's plate inside its cell by the control inset, and keeps the others the cell's own size", () => {
    render(<Format onChange={() => undefined} density="composer" />)
    const composer = thumb().style
    expect(composer.top).toBe(
      "calc(var(--spacing) + var(--spacing-control-inset))"
    )
    expect(composer.width).toContain("- 2 * var(--spacing-control-inset))")
    expect(composer.transform).toContain(
      "100% + 2 * var(--spacing-control-inset)"
    )
    cleanup()
    render(<Format onChange={() => undefined} density="row" />)
    const row = thumb().style
    expect(row.top).toBe("calc(0%)")
    expect(row.width).toContain("2 * var(--spacing)) / 3)")
    expect(row.transform).toContain("+ var(--spacing)")
  })

  it("sets every cell at the same medium weight, so choosing one never changes a label's weight", () => {
    for (const density of ["chrome", "composer", "row"] as const) {
      render(<Format onChange={() => undefined} density={density} />)
      for (const cell of screen.getAllByRole("radio")) {
        const classes = cell.className.split(" ")
        expect(classes).toContain("font-medium")
        expect(classes).not.toContain("data-checked:font-medium")
      }
      cleanup()
    }
  })

  it("draws the composer's plate one tone above its well on every ground, so the sheet's plate shows", () => {
    render(<Format onChange={() => undefined} density="composer" />)
    const classes = thumb().className.split(" ")
    expect(classes).toContain("bg-surface-2")
    expect(classes).not.toContain("bg-(--tint)")
  })

  it("paints its track with the well of its ground, never the progress track", () => {
    render(<Format onChange={() => undefined} />)
    const classes = screen
      .getByRole("radiogroup", { name: "Format" })
      .className.split(" ")
    expect(classes).toContain("bg-(--well)")
    expect(classes).not.toContain("bg-track")
  })
})
