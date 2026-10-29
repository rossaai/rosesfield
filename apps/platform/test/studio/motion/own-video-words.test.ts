import { describe, expect, it } from "vitest"
import { frameTimesOf, planFrameSizeOf } from "@/studio/motion/clip-frames"
import { leftOutText } from "@/studio/motion/left-out"

describe("the photos left out of a draft", () => {
  it("names each one by its place in the well, in one plain sentence", () => {
    expect(leftOutText([3])).toBe(
      "Photo 4 matches nothing in your video, so the draft leaves it out."
    )
    expect(leftOutText([1, 4, 5])).toBe(
      "Photos 2, 5, and 6 match nothing in your video, so the draft leaves them out."
    )
  })
})

describe("the frames the plan reads", () => {
  it("are the first, two in the middle and the last, just before the clip ends", () => {
    expect(frameTimesOf(4.05)).toEqual([0, 4 / 3, 8 / 3, 4])
  })

  it("keep the video's shape with the long side at 512 px, and never grow a small video", () => {
    expect(planFrameSizeOf({ width: 720, height: 1280 })).toEqual({
      width: 288,
      height: 512,
    })
    expect(planFrameSizeOf({ width: 1920, height: 1080 })).toEqual({
      width: 512,
      height: 288,
    })
    expect(planFrameSizeOf({ width: 320, height: 240 })).toEqual({
      width: 320,
      height: 240,
    })
  })
})
