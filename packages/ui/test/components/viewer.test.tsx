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
})
