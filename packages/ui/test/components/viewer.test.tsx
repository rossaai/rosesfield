import { Viewer } from "@rosesfield/ui/components/viewer"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

type Steps = { next: () => void; change: (open: boolean) => void }

function Harness({ next, change }: Steps) {
  const [open, setOpen] = useState(true)
  return (
    <Viewer
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        change(value)
      }}
      origin={null}
      aspect={{ width: 16, height: 9 }}
      title="A demo engine output"
      closeLabel="Close"
      next={{ label: "Next", onSelect: next }}
    >
      <span>media</span>
    </Viewer>
  )
}

function renderViewer(): Steps {
  const steps = { next: vi.fn(), change: vi.fn() }
  render(<Harness {...steps} />)
  return steps
}

afterEach(cleanup)

describe("Viewer", () => {
  it("opens as a dialog named for its asset", () => {
    renderViewer()
    expect(
      screen.queryByRole("dialog", { name: "A demo engine output" })
    ).not.toBeNull()
  })

  it("closes on Escape and leaves the page", async () => {
    const { change } = renderViewer()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(change).toHaveBeenCalledWith(false)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("closes on its close button", () => {
    const { change } = renderViewer()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(change).toHaveBeenCalledWith(false)
  })

  it("moves to the next asset on the right arrow key", () => {
    const { next } = renderViewer()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" })
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("hides the page behind a solid cover at every width, with no see-through scrim", () => {
    renderViewer()
    const cover = document.querySelector("[data-slot='viewer-cover']")
    expect(cover?.className.split(" ")).toEqual(
      expect.arrayContaining(["inset-0", "bg-layer", "@regular:bg-surface"])
    )
    expect(cover?.className).not.toContain("hidden")
    expect(document.querySelector(".bg-scrim")).toBeNull()
  })

  it("pads the stage 16 px on a wide screen, so a 16:9 video is 1048 px wide beside the panel", () => {
    renderViewer()
    const stage = document.querySelector("[data-slot='media-player-picture']")
    expect(stage?.className.split(" ")).toContain("@regular:p-4")
    expect(stage?.className).not.toContain("p-s12 ")
  })

  it("sets Next 24 px from the stage's edge, 8 px inside a picture that fills the 16 px padded stage, so it never crosses the picture's edge", () => {
    renderViewer()
    const next = screen.getByRole("button", { name: "Next" })
    const classes = next.className.split(" ")
    expect(classes).toContain("right-6")
    expect(classes).not.toContain("right-s2")
  })

  it("keeps a 16 px gutter at each side of the picture on a phone, for an image as for a video", () => {
    renderViewer()
    const stage = document.querySelector("[data-slot='media-player-picture']")
    const classes = stage?.className.split(" ") ?? []
    expect(classes).toContain("px-4")
    expect(classes).not.toContain("px-0")
  })

  it("sets its 32 px close 12 px from the panel's right and 16 px from its top", () => {
    renderViewer()
    const close = screen.getByRole("button", { name: "Close" })
    expect(close.parentElement?.className.split(" ")).toEqual(
      expect.arrayContaining(["top-6", "right-5"])
    )
    expect(close.className).toContain("size-8")
  })
})
