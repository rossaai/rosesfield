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

  it.each(["chrome", "composer", "row"] as const)(
    "draws its %s density on the track colour at radius full with an ink thumb",
    (density) => {
      render(<Format onChange={() => undefined} density={density} />)
      const track = screen.getByRole("radiogroup", { name: "Format" })
      expect(track.className.split(" ")).toEqual(
        expect.arrayContaining(["bg-track", "rounded-full", "p-control-inset"])
      )
      expect(track.className.split(" ")).not.toContain("bg-(--well)")
      expect(thumb().className.split(" ")).toEqual(
        expect.arrayContaining(["bg-ink", "rounded-full"])
      )
      expect(
        thumb()
          .className.split(" ")
          .filter((name) => /^bg-/.test(name))
      ).toEqual(["bg-ink"])
    }
  )

  it("stands 40 px in chrome and 26 px in the composer and a row", () => {
    render(<Format onChange={() => undefined} density="chrome" />)
    expect(
      screen.getByRole("radiogroup", { name: "Format" }).className.split(" ")
    ).toContain("h-field")
    cleanup()
    for (const density of ["composer", "row"] as const) {
      render(<Format onChange={() => undefined} density={density} />)
      expect(
        screen.getByRole("radiogroup", { name: "Format" }).className.split(" ")
      ).toContain("h-button-small")
      cleanup()
    }
  })

  it("sets its labels at the 11 px legal size, Medium for the chosen cell on the canvas colour and Regular for the rest", () => {
    render(<Format onChange={() => undefined} />)
    const cell = screen.getByRole("radio", { name: "4:3" })
    expect(cell.className.split(" ")).toEqual(
      expect.arrayContaining([
        "text-legal",
        "font-normal",
        "data-checked:font-medium",
        "data-checked:text-canvas",
        "motion-tint",
      ])
    )
  })
})
