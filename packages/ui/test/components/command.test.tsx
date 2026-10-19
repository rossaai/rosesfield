import { Command } from "@rosesfield/ui/components/command"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

function renderCommand(): {
  openVideo: ReturnType<typeof vi.fn>
  change: ReturnType<typeof vi.fn>
} {
  const openVideo = vi.fn()
  const change = vi.fn()
  render(
    <Command
      open
      onOpenChange={change}
      title="Search apps and actions"
      placeholder="Search apps and actions"
      empty="Nothing matches your search"
      closeLabel="Close"
      sections={[
        {
          value: "apps",
          label: "Apps",
          items: [
            { value: "image", label: "Image", onSelect: vi.fn() },
            { value: "video", label: "Video", onSelect: openVideo },
          ],
        },
      ]}
    />
  )
  return { openVideo, change }
}

afterEach(cleanup)

describe("Command", () => {
  it("narrows the list to what you type", () => {
    renderCommand()
    const input = screen.getByRole("combobox", {
      name: "Search apps and actions",
    })
    fireEvent.change(input, { target: { value: "vid" } })
    expect(screen.queryByRole("option", { name: "Video" })).not.toBeNull()
    expect(screen.queryByRole("option", { name: "Image" })).toBeNull()
  })

  it("runs the chosen entry and closes", () => {
    const { openVideo, change } = renderCommand()
    fireEvent.click(screen.getByRole("option", { name: "Video" }))
    expect(openVideo).toHaveBeenCalledTimes(1)
    expect(change).toHaveBeenCalledWith(false)
  })

  it("says so when nothing matches", () => {
    renderCommand()
    const input = screen.getByRole("combobox", {
      name: "Search apps and actions",
    })
    fireEvent.change(input, { target: { value: "zzz" } })
    expect(screen.queryByText("Nothing matches your search")).not.toBeNull()
  })
})
