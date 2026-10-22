import { Dialog, DialogContent } from "@rosesfield/ui/components/dialog"
import { originPoseOf } from "@rosesfield/ui/hooks/use-layer-origin"
import { act, cleanup, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("originPoseOf", () => {
  it("centres the layer on its opener at the opener's size", () => {
    const opener = { left: 1300, top: 10, width: 80, height: 36 }
    const layer = { left: 505, top: 300, width: 430, height: 300 }
    const pose = originPoseOf(opener, layer)
    const [, x, y, scale] =
      /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(pose) ??
      []
    expect(Number(x)).toBe(1340 - 720)
    expect(Number(y)).toBe(28 - 450)
    expect(Number(scale)).toBeCloseTo(0.186, 3)
  })

  it("never draws the first frame larger than the layer", () => {
    const pose = originPoseOf(
      { left: 0, top: 0, width: 900, height: 900 },
      { left: 0, top: 0, width: 430, height: 300 }
    )
    expect(pose).toMatch(/scale\(1\)$/)
  })
})

function Opened() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Connect
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel="Close">
          <p>Paste your key</p>
        </DialogContent>
      </Dialog>
    </>
  )
}

function rectOf(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => undefined,
  }
}

describe("a dialog's origin", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes its closed look from the element that opened it", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function rect(this: HTMLElement) {
        if (this.dataset.slot === "dialog-content") {
          return rectOf(297, 234, 430, 300)
        }
        if (this.textContent === "Connect") {
          return rectOf(900, 10, 80, 36)
        }
        return rectOf(0, 0, 0, 0)
      }
    )
    render(<Opened />)
    const connect = screen.getByRole("button", { name: "Connect" })
    connect.focus()
    act(() => connect.click())
    const popup = screen
      .getByText("Paste your key")
      .closest<HTMLElement>("[data-slot='dialog-content']")
    expect(popup?.style.getPropertyValue("--layer-origin")).toBe(
      originPoseOf(rectOf(900, 10, 80, 36), rectOf(297, 234, 430, 300))
    )
  })

  it("keeps the rise when no element opened it", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <p>Your key expired</p>
        </DialogContent>
      </Dialog>
    )
    const popup = screen
      .getByText("Your key expired")
      .closest<HTMLElement>("[data-slot='dialog-content']")
    expect(popup?.style.getPropertyValue("--layer-origin")).toBe("")
  })
})
