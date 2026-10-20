import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { ViewerVideo } from "@/viewer/viewer-video"

const wide = { width: 16, height: 9 }

function asWindow(isRegular: boolean): void {
  document.documentElement.style.setProperty("--container-regular", "768px")
  vi.stubGlobal("matchMedia", () => ({
    matches: isRegular,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function renderVideo(): HTMLElement {
  const { container } = render(
    <TooltipProvider>
      <ViewerVideo src="/clip.mp4" label="Video result" aspect={wide} />
    </TooltipProvider>
  )
  return container
}

function rangesIn(container: HTMLElement): HTMLInputElement[] {
  return [...container.querySelectorAll<HTMLInputElement>("input[type=range]")]
}

function rangeNamed(container: HTMLElement, name: string): HTMLInputElement {
  const found = rangesIn(container).find(
    (range) => range.getAttribute("aria-label") === name
  )
  if (found === undefined) {
    throw new Error(`no range named ${name}`)
  }
  return found
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty("--container-regular")
})

describe("the viewer's video", () => {
  it("sets a control row's room above the picture on a wide window, so the picture sits at the centre", () => {
    asWindow(true)
    const container = renderVideo()
    const picture = container.querySelector("[data-slot=viewer-picture]")
    const video = container.querySelector("video")

    expect(picture?.className.split(" ")).toContain("pt-s12")
    expect(
      container
        .querySelector("[data-slot=viewer-controls]")
        ?.className.split(" ")
    ).toContain("h-s12")
    expect(picture?.firstElementChild).toBe(video)
    expect(video?.style.aspectRatio).toBe("16 / 9")
    expect(picture?.getAttribute("style")).toContain(
      "100cqh - 2 * var(--spacing-s12)"
    )
  })

  it("keeps the 16 px gutter on a phone, with no room above the picture", () => {
    asWindow(false)
    const container = renderVideo()
    const picture = container.querySelector("[data-slot=viewer-picture]")

    expect(picture?.className.split(" ")).not.toContain("pt-s12")
    expect(picture?.getAttribute("style")).toContain(
      "100cqw - 2 * var(--spacing-s5)"
    )
  })

  it("carries a volume track right after the speaker, before full screen", () => {
    asWindow(true)
    const container = renderVideo()
    const row = container.querySelector("[data-slot=viewer-controls]")
    const speaker = screen.getByRole("button", {
      name: t("explore.video.soundOn"),
    })
    const sliders = rangesIn(container)
    const volume = rangeNamed(container, t("explore.video.volume"))
    const fullScreen = screen.getByRole("button", {
      name: t("explore.video.fullScreen"),
    })

    expect(sliders).toHaveLength(2)
    expect(row?.contains(volume)).toBe(true)
    expect(
      speaker.compareDocumentPosition(volume) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      volume.compareDocumentPosition(fullScreen) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(volume.getAttribute("aria-valuenow")).toBe("0")
  })

  it("moves the volume track with the sound", () => {
    asWindow(true)
    const container = renderVideo()
    const video = container.querySelector("video") as HTMLVideoElement
    const volume = rangeNamed(container, t("explore.video.volume"))

    act(() => {
      video.muted = false
      video.volume = 0.5
      video.dispatchEvent(new Event("volumechange"))
    })
    expect(volume.getAttribute("aria-valuenow")).toBe("0.5")
    expect(
      screen.getByRole("button", { name: t("explore.video.soundOff") })
    ).toBeTruthy()
  })
})
