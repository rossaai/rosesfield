import { describe, expect, it } from "vitest"
import { wordsForCode } from "@/copy/error-words"
import { frameTimesOf, planFrameSizeOf } from "@/studio/motion/clip-frames"
import { leftOutText } from "@/studio/motion/left-out"
import { clipMessageOf } from "@/studio/motion/use-motion-screen"

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

describe("your own video's refusals", () => {
  const tooLong = {
    name: "clip",
    key: "field.asset.tooLong" as const,
    values: { seconds: "12", max: 10 },
  }
  const modelNames = /LTX|Qwen|GPT|GLM|depth|mask|matte|plan|node/i

  it("say what is wrong with your video in plain words and name no model", () => {
    const words = clipMessageOf(tooLong, { min: 2, max: 10 }, null) ?? ""
    expect(words).toBe(
      "This clip runs 12 seconds. Pick one of 10 seconds or less."
    )
    expect(words).not.toMatch(modelNames)
  })

  it("name the model you picked when you picked one, the control", () => {
    expect(
      clipMessageOf(tooLong, { min: 2, max: 10 }, "LTX 2.3 control")
    ).toMatch(/LTX 2.3 control/)
  })

  it("say in one plain sentence that nothing in your video matches your photos, and that your inputs are kept", () => {
    const words = wordsForCode("MOTION_NOTHING_TO_CHANGE")
    expect(words.title).toBe("Nothing in your video matches your photos")
    expect(words.body).toContain("Your inputs are kept.")
    expect(`${words.title} ${words.body}`).not.toMatch(modelNames)
    expect(wordsForCode("MOTION_PLAN_UNREADABLE").title).not.toMatch(modelNames)
    expect(wordsForCode("ENGINE_KEY_INVALID").title).toBe(
      "Comfy refused your key"
    )
  })
})
