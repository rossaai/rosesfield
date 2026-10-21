import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { formatDuration } from "@/copy/format"
import { AudioRow } from "@/pieces/audio-row"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function show(extra: {
  durationSeconds?: number | null
  meter?: (fraction: number) => ReactNode
  action?: ReactNode
}): HTMLElement {
  return render(
    <TooltipProvider>
      <AudioRow
        src="blob:audio"
        name="Take one"
        durationSeconds={extra.durationSeconds ?? null}
        {...(extra.meter === undefined ? {} : { meter: extra.meter })}
        action={extra.action}
      />
    </TooltipProvider>
  ).container
}

describe("the audio row", () => {
  it("shows the length the audio's metadata reads when the asset names none", () => {
    vi.spyOn(
      window.HTMLMediaElement.prototype,
      "duration",
      "get"
    ).mockReturnValue(7)
    const container = show({ durationSeconds: null })
    const audio = container.querySelector("audio")
    if (audio === null) {
      throw new Error("the row draws no audio element")
    }
    fireEvent.loadedMetadata(audio)
    expect(screen.getByText(formatDuration(7))).toBeTruthy()
  })

  it("keeps the asset's own length over the metadata's", () => {
    vi.spyOn(
      window.HTMLMediaElement.prototype,
      "duration",
      "get"
    ).mockReturnValue(7)
    const container = show({ durationSeconds: 3 })
    const audio = container.querySelector("audio")
    if (audio === null) {
      throw new Error("the row draws no audio element")
    }
    fireEvent.loadedMetadata(audio)
    expect(screen.getByText(formatDuration(3))).toBeTruthy()
    expect(screen.queryByText(formatDuration(7))).toBeNull()
  })

  it("draws the given meter with the played fraction in place of the track bar", () => {
    const meter = vi.fn((fraction: number) => (
      <span data-slot="meter">{fraction}</span>
    ))
    const container = show({ meter })
    expect(
      container.querySelector("[data-slot='meter']")?.textContent
    ).toBe("0")
    expect(meter).toHaveBeenCalledWith(0)
    expect(container.querySelector(".h-track")).toBeNull()
  })

  it("draws the action after the row's own buttons", () => {
    const container = show({
      action: <button type="button">Remove</button>,
    })
    const buttons = Array.from(container.querySelectorAll("button"))
    expect(buttons.at(-1)?.textContent).toBe("Remove")
  })
})
