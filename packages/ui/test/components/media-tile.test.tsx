import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Entry = Pick<IntersectionObserverEntry, "isIntersecting" | "target">

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly callback: (entries: Entry[]) => void
  readonly targets: Element[] = []

  constructor(callback: (entries: Entry[]) => void) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.targets.push(target)
  }

  disconnect(): void {
    this.targets.length = 0
  }

  show(isIntersecting: boolean): void {
    const entries = this.targets.map((target) => ({ target, isIntersecting }))
    act(() => this.callback(entries))
  }
}

function observerOf(element: Element): FakeIntersectionObserver {
  const observer = FakeIntersectionObserver.instances.find((candidate) =>
    candidate.targets.includes(element)
  )
  if (observer === undefined) {
    throw new Error("no observer watches this element")
  }
  return observer
}

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query }))
}

let play: ReturnType<typeof vi.spyOn>
let pause: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  FakeIntersectionObserver.instances = []
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
  stubReducedMotion(false)
  play = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockImplementation(() => Promise.resolve())
  pause = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderVideo(): HTMLVideoElement {
  render(<MediaTile kind="video" src="clip.mp4" alt="A demo engine output" />)
  const video = screen.getByLabelText("A demo engine output")
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("the tile did not render a video")
  }
  return video
}

describe("MediaTile with a video", () => {
  it("renders muted and paused before it enters the view", () => {
    const video = renderVideo()
    expect(video.muted).toBe(true)
    expect(video.dataset.playback).toBe("paused")
    expect(play).not.toHaveBeenCalled()
  })

  it("plays when it comes into view", () => {
    const video = renderVideo()
    observerOf(video).show(true)
    expect(play).toHaveBeenCalledTimes(1)
    expect(video.dataset.playback).toBe("playing")
  })

  it("pauses when it leaves the view", () => {
    const video = renderVideo()
    const observer = observerOf(video)
    observer.show(true)
    observer.show(false)
    expect(pause).toHaveBeenCalledTimes(1)
    expect(video.dataset.playback).toBe("paused")
  })

  it("keeps the poster under reduced motion", () => {
    stubReducedMotion(true)
    const video = renderVideo()
    observerOf(video).show(true)
    expect(play).not.toHaveBeenCalled()
  })
})

describe("MediaTile captions", () => {
  it("joins the note and the length in one one-line pill", () => {
    render(
      <MediaTile
        kind="image"
        src="output.png"
        alt="An output"
        caption="Demo engine"
        length="2 seconds"
      />
    )
    const pills = document.querySelectorAll("[data-slot='media-tile-caption']")
    expect(pills).toHaveLength(1)
    const [pill] = pills
    expect(pill?.textContent).toBe("Demo engine, 2 seconds")
    expect(pill?.className).toContain("whitespace-nowrap")
    expect(pill?.className).toContain("truncate")
  })

  it("pads its pill 5 px a side, so Demo engine fits whole on a 102 px thumbnail", () => {
    render(
      <MediaTile
        kind="image"
        src="output.png"
        alt="An output"
        caption="Demo engine"
      />
    )
    const pill = document.querySelector("[data-slot='media-tile-caption']")
    expect(pill?.className.split(" ")).toContain("px-s1_5")
    expect(pill?.className.split(" ")).not.toContain("px-s2")
  })

  it("shows the length alone when the tile has no note", () => {
    render(
      <MediaTile
        kind="image"
        src="output.png"
        alt="An output"
        length="2 seconds"
      />
    )
    const pills = document.querySelectorAll("[data-slot='media-tile-caption']")
    expect(pills).toHaveLength(1)
    expect(pills[0]?.textContent).toBe("2 seconds")
  })
})
