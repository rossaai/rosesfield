import { Viewer } from "@rosesfield/ui/components/viewer"
import {
  growPoseOf,
  growScaleOf,
  originShapeOf,
} from "@rosesfield/ui/hooks/use-grow-from"
import { cleanup, render } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Box = { left: number; top: number; width: number; height: number }

function shownBox(pose: { transform: string; clipPath: string }, frame: Box) {
  const [x = 0, y = 0, scale = 1] = (
    /translate\(([-\d.e]+)px, ([-\d.e]+)px\) scale\(([-\d.e]+)\)/.exec(
      pose.transform
    ) ?? []
  )
    .slice(1)
    .map(Number)
  const [top = 0, right = 0, bottom = 0, left = 0] = (
    /inset\(([-\d.e]+)px ([-\d.e]+)px ([-\d.e]+)px ([-\d.e]+)px/.exec(
      pose.clipPath
    ) ?? []
  )
    .slice(1)
    .map(Number)
  return {
    left: frame.left + x + left * scale,
    top: frame.top + y + top * scale,
    width: (frame.width - left - right) * scale,
    height: (frame.height - top - bottom) * scale,
  }
}

function expectBox(actual: Box, expected: Box): void {
  expect(actual.left).toBeCloseTo(expected.left, 4)
  expect(actual.top).toBeCloseTo(expected.top, 4)
  expect(actual.width).toBeCloseTo(expected.width, 4)
  expect(actual.height).toBeCloseTo(expected.height, 4)
}

describe("the pose a viewer frame grows from", () => {
  const tile = { left: 16, top: 195, width: 102, height: 102 }

  it("shows exactly the tile's box on the first frame when a tall picture fills the frame", () => {
    const frame = { left: 306, top: 16, width: 467, height: 868 }
    const pose = growPoseOf(tile, frame, frame, 12)

    expectBox(shownBox(pose, frame), tile)
    expect(pose.transform).toMatch(/scale\(0\.21841/)
  })

  it("shows the tile's box when the picture sits inside a frame that also holds the video controls", () => {
    const frame = { left: 16, top: 104, width: 1048, height: 692 }
    const picture = { left: 16, top: 152, width: 1048, height: 590 }
    const pose = growPoseOf(tile, frame, picture, 12)
    const [top = 0, right = 0, bottom = 0, left = 0] = (
      /inset\(([-\d.e]+)px ([-\d.e]+)px ([-\d.e]+)px ([-\d.e]+)px/.exec(
        pose.clipPath
      ) ?? []
    )
      .slice(1)
      .map(Number)

    expectBox(shownBox(pose, frame), tile)
    expect(left + (frame.width - left - right) / 2).toBeCloseTo(524, 4)
    expect(top + (frame.height - top - bottom) / 2).toBeCloseTo(343, 4)
  })

  it("keeps the tile's corner radius at the first frame's scale", () => {
    const frame = { left: 0, top: 0, width: 400, height: 800 }
    const pose = growPoseOf(
      { left: 0, top: 0, width: 100, height: 100 },
      frame,
      frame,
      12
    )

    expect(pose.clipPath).toMatch(/round 48px\)$/)
  })
})

describe("the shape a viewer reads from the clicked tile", () => {
  function sized<T extends HTMLElement>(
    element: T,
    sizes: Record<string, number>
  ): T {
    for (const [name, value] of Object.entries(sizes)) {
      Object.defineProperty(element, name, { value })
    }
    return element
  }

  it("reads a video's own size from the tile that holds the expand button", () => {
    const holder = document.createElement("figure")
    holder.dataset.slot = "media"
    holder.append(
      sized(document.createElement("video"), {
        videoWidth: 1080,
        videoHeight: 1920,
      })
    )
    const expand = document.createElement("button")
    holder.append(expand)

    expect(originShapeOf(expand)).toEqual({
      kind: "video",
      width: 1080,
      height: 1920,
    })
  })

  it("reads an image's natural size, and nothing before the image has loaded", () => {
    const tile = document.createElement("button")
    const image = sized(document.createElement("img"), {
      naturalWidth: 864,
      naturalHeight: 1152,
    })
    tile.append(image)
    const empty = document.createElement("button")
    empty.append(document.createElement("img"))

    expect(originShapeOf(tile)).toEqual({
      kind: "image",
      width: 864,
      height: 1152,
    })
    expect(originShapeOf(empty)).toBeNull()
  })
})

type Played = {
  node: Element
  keyframes: Keyframe[]
  cancel: () => void
  finished: Promise<void>
  playState: "running" | "paused"
  pause: () => void
  play: () => void
}

const tileBox = new DOMRect(16, 195, 102, 102)
const frameBox = new DOMRect(306, 16, 467, 868)

describe("a viewer opening in strict mode", () => {
  let live: Set<Played>

  beforeEach(() => {
    live = new Set()
    document.documentElement.style.setProperty(
      "--layer-in-transform",
      "500ms linear"
    )
    document.documentElement.style.setProperty(
      "--layer-in-opacity",
      "400ms linear"
    )
    HTMLElement.prototype.animate = function animate(
      this: HTMLElement,
      keyframes
    ) {
      const played: Played = {
        node: this,
        keyframes: keyframes as Keyframe[],
        cancel: () => live.delete(played),
        finished: Promise.resolve(),
        playState: "running",
        pause: () => {
          played.playState = "paused"
        },
        play: () => {
          played.playState = "running"
        },
      }
      live.add(played)
      return played as unknown as Animation
    }
    HTMLElement.prototype.getAnimations = function getAnimations() {
      return [...live].filter(
        (played) => played.node === this
      ) as unknown as Animation[]
    }
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.dataset.origin === "tile") {
          return tileBox
        }
        if (this.dataset.slot !== "viewer-frame") {
          return new DOMRect()
        }
        const isPosed = [...live].some(
          (played) =>
            played.node === this &&
            played.keyframes.some((frame) => frame.transform !== undefined)
        )
        return isPosed ? tileBox : frameBox
      }
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    Reflect.deleteProperty(HTMLElement.prototype, "animate")
    Reflect.deleteProperty(HTMLElement.prototype, "getAnimations")
    document.documentElement.removeAttribute("style")
  })

  it("starts its frame from the tile even when the frame mounts twice", () => {
    const tile = document.createElement("button")
    tile.dataset.origin = "tile"
    document.body.append(tile)
    render(
      <StrictMode>
        <Viewer
          open={true}
          onOpenChange={() => undefined}
          origin={tile}
          aspect={{ width: 9, height: 16 }}
          title="A result"
          closeLabel="Close"
        >
          <span>media</span>
        </Viewer>
      </StrictMode>
    )
    const grows = [...live].filter((played) =>
      played.keyframes.some((frame) => frame.transform !== undefined)
    )

    expect(grows).toHaveLength(1)
    expect(grows[0]?.keyframes[0]?.transform).toMatch(/scale\(0\.21841/)
    tile.remove()
  })

  it("holds the grow on its first pose until the frame that mounts the viewer has painted, so a slow mount never eats the opening", () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    const tile = document.createElement("button")
    tile.dataset.origin = "tile"
    document.body.append(tile)
    render(
      <Viewer
        open={true}
        onOpenChange={() => undefined}
        origin={tile}
        aspect={{ width: 9, height: 16 }}
        title="A result"
        closeLabel="Close"
      >
        <span>media</span>
      </Viewer>
    )
    const grow = [...live].find((played) =>
      played.keyframes.some((frame) => frame.transform !== undefined)
    )
    expect(grow?.playState).toBe("paused")
    for (const frame of frames.splice(0)) {
      frame(0)
    }
    expect(grow?.playState).toBe("paused")
    for (const frame of frames.splice(0)) {
      frame(16)
    }
    expect(grow?.playState).toBe("running")
    tile.remove()
  })
})

describe("growPoseOf's scale", () => {
  it("never starts larger than its target, from an origin larger than the target", () => {
    const tile = { left: 100, top: 50, width: 699, height: 932 }
    const target = { left: 300, top: 100, width: 400, height: 600 }
    expect(growScaleOf(tile, target)).toBe(1)
    expect(growPoseOf(tile, target, target, 12).transform).toMatch(
      /scale\(1\)$/
    )
  })

  it("takes the larger of the two ratios below one", () => {
    expect(
      growScaleOf({ width: 100, height: 300 }, { width: 400, height: 600 })
    ).toBe(0.5)
  })
})
