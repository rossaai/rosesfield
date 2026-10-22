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

  it("sets Next as a 36 px glass circle 16 px inside the picture's edge, so it reads on any ground", () => {
    renderViewer()
    const next = screen.getByRole("button", { name: "Next" })
    const classes = next.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "right-s5",
        "size-icon",
        "material-thin",
        "border",
        "border-surface-2",
        "shadow-float",
      ])
    )
  })

  it("keeps a 16 px gutter at each side of the picture on a phone, for an image as for a video", () => {
    renderViewer()
    const stage = document.querySelector("[data-slot='media-player-picture']")
    const classes = stage?.className.split(" ") ?? []
    expect(classes).toContain("px-4")
    expect(classes).not.toContain("px-0")
  })

  it("sets its 36 px glass close 16 px from the corner", () => {
    renderViewer()
    const close = screen.getByRole("button", { name: "Close" })
    expect(close.parentElement?.className.split(" ")).toEqual(
      expect.arrayContaining(["top-s5", "right-s5"])
    )
    expect(close.className.split(" ")).toEqual(
      expect.arrayContaining(["size-icon", "material-thin"])
    )
  })
})

describe("Viewer's panel", () => {
  it("holds a fixed head, a body that scrolls and a fixed foot for its actions", () => {
    render(
      <Viewer
        open
        onOpenChange={() => undefined}
        origin={null}
        aspect={{ width: 9, height: 16 }}
        title="A clip"
        closeLabel="Close"
        head={<h2>Clip</h2>}
        aside={<p>A long prompt</p>}
        actions={<button type="button">Delete</button>}
      >
        <span>media</span>
      </Viewer>
    )
    const aside = document.querySelector("[data-slot='viewer-aside']")
    expect(aside?.className.split(" ")).toEqual(
      expect.arrayContaining(["flex-col", "overflow-hidden"])
    )
    const parts = [...(aside?.children ?? [])].map((part) =>
      part.getAttribute("data-slot")
    )
    expect(parts).toEqual(["viewer-head", "viewer-body", "viewer-foot"])
    expect(
      document.querySelector("[data-slot='viewer-body']")?.className.split(" ")
    ).toEqual(expect.arrayContaining(["min-h-0", "flex-1", "overflow-y-auto"]))
    for (const fixed of ["viewer-head", "viewer-foot"]) {
      expect(
        document.querySelector(`[data-slot='${fixed}']`)?.className.split(" ")
      ).toContain("shrink-0")
    }
    expect(
      screen
        .getByRole("button", { name: "Delete" })
        .closest("[data-slot]")
        ?.getAttribute("data-slot")
    ).toBe("viewer-foot")
  })
})
