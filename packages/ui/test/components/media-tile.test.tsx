import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readSource } from "../read-source"

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

  it("asks a video with no poster for a frame past its start, and keeps the tile hidden over its skeleton until that frame loads", () => {
    const video = renderVideo()
    expect(video.getAttribute("src")).toBe("clip.mp4#t=0.1")
    const tile = video.closest("[data-slot='media-tile']")
    Object.defineProperty(video, "videoWidth", { value: 1080 })
    Object.defineProperty(video, "videoHeight", { value: 1920 })
    fireEvent.loadedMetadata(video)
    expect(video.dataset.arrival).toBe("waiting")
    expect(tile?.className.split(" ")).toContain("motion-pulse")
    fireEvent.loadedData(video)
    expect(video.dataset.arrival).toBe("loaded")
    expect(tile?.className.split(" ")).not.toContain("motion-pulse")
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
    const badge = pill?.querySelector("[data-slot='media-badge']")
    expect(badge?.className).toContain("whitespace-nowrap")
    expect(badge?.className).toContain("truncate")
    expect(badge?.className.split(" ")).toContain("material-thin")
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
    const pill = document.querySelector(
      "[data-slot='media-tile-caption'] [data-slot='media-badge']"
    )
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

describe("MediaTile arrival", () => {
  it("holds its image hidden over a breathing well until it decodes, then arrives on the enter preset", async () => {
    let decoded: () => void = () => undefined
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: () =>
        new Promise<void>((resolve) => {
          decoded = resolve
        }),
    })
    render(<MediaTile kind="image" src="a.png" alt="A rose" />)
    const picture = screen.getByAltText("A rose")
    const tile = picture.closest("[data-slot='media-tile']")
    expect(picture.getAttribute("data-arrival")).toBe("waiting")
    expect(picture.className.split(" ")).toContain("motion-enter")
    expect(tile?.className.split(" ")).toContain("motion-pulse")
    act(() => {
      picture.dispatchEvent(new Event("load"))
    })
    expect(picture.getAttribute("data-arrival")).toBe("waiting")
    await act(async () => {
      decoded()
      await Promise.resolve()
    })
    expect(picture.getAttribute("data-arrival")).toBe("loaded")
    expect(tile?.className.split(" ")).not.toContain("motion-pulse")
    Reflect.deleteProperty(HTMLImageElement.prototype, "decode")
  })

  it("staggers by its place in a list, one beat each and capped at the stagger's length", () => {
    render(
      <>
        <MediaTile kind="image" src="a.png" alt="First" index={0} />
        <MediaTile kind="image" src="b.png" alt="Late" index={20} />
      </>
    )
    const first = screen.getByAltText("First").closest("[data-slot]")
    const late = screen.getByAltText("Late").closest("[data-slot]")
    expect(first?.className.split(" ")).toContain("[--arrival-index:0]")
    expect(late?.className.split(" ")).toContain("[--arrival-index:8]")
    const motion = readSource("styles/motion.css")
    expect(motion).toContain(
      "calc(var(--arrival-index, 0) * var(--arrival-step))"
    )
    expect(motion).toContain("var(--duration-stagger-max)")
    expect(motion).toMatch(/--arrival-step: 0s;/)
  })

  it("draws no light over a photo it opens", () => {
    render(
      <MediaTile
        kind="image"
        src="a.png"
        alt="Open me"
        onOpen={() => undefined}
      />
    )
    const tile = screen.getByRole("button", { name: "Open me" })
    expect(tile.className).not.toContain("after:")
  })
})
