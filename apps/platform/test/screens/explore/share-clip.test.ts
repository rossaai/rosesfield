import { describe, expect, it } from "vitest"
import {
  clipSeconds,
  clipSize,
  clipTimes,
  fitRect,
  recorderType,
} from "@/screens/explore/share-clip"

const text = { kind: "text" as const, text: "a red rose" }
const video = { kind: "video" as const, src: "blob:clip" }
const image = { kind: "image" as const, src: "blob:image" }

describe("the clip for a post", () => {
  it("is 9:16", () => {
    expect(clipSize.width / clipSize.height).toBeCloseTo(9 / 16)
  })

  it("shows the input, then the result, and stays under 15 seconds", () => {
    expect(clipSeconds({ input: text, result: image }, null)).toBe(6.5)
    expect(clipSeconds({ input: image, result: video }, 4)).toBe(6.5)
    expect(clipSeconds({ input: image, result: video }, 60)).toBeLessThan(
      clipTimes.limitSeconds
    )
    expect(clipSeconds({ input: image, result: video }, null)).toBeLessThan(
      clipTimes.limitSeconds
    )
  })

  it("records MP4 where the browser can, and WebM where it cannot", () => {
    expect(recorderType(() => true)).toBe("video/mp4;codecs=avc1")
    expect(recorderType((type) => type.startsWith("video/webm"))).toBe(
      "video/webm;codecs=vp9"
    )
    expect(recorderType(() => false)).toBeNull()
  })

  it("fits a wide result inside the frame and covers it when asked", () => {
    const wide = { width: 1600, height: 900 }
    const contained = fitRect(wide, clipSize, "contain")
    const covered = fitRect(wide, clipSize, "cover")
    expect(contained.width).toBe(clipSize.width)
    expect(contained.y).toBeGreaterThan(0)
    expect(covered.height).toBe(clipSize.height)
    expect(covered.x).toBeLessThan(0)
  })
})
