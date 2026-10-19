import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const items = [
  { value: "1-1", label: "1:1" },
  { value: "4-3", label: "4:3" },
  { value: "16-9", label: "16:9" },
]

function Format({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("1-1")
  return (
    <SegmentedControl
      label="Format"
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

  it("moves the thumb under the chosen cell", () => {
    render(<Format onChange={() => undefined} />)
    expect(thumb().style.transform).toBe("translateX(0%)")
    fireEvent.click(screen.getByRole("radio", { name: "16:9" }))
    expect(thumb().style.transform).toBe("translateX(200%)")
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
