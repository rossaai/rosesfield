import { startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { both, clipId, motion, photoId } from "./motion-replay"

const body = startRunBodyFor(motion)

function isRefused(given: Record<string, unknown>): boolean {
  return !body.safeParse(given).success
}

describe("the motion definition", () => {
  it("takes a photo and a clip and fills every other input with its default, the model with the LTX 2.3 control graph", () => {
    expect(body.parse({ inputs: both })).toEqual({
      inputs: {
        ...both,
        model: "ltx-2-3-control",
        sound: "off",
        resolution: "720p",
      },
      count: 1,
      aspectRatio: "9:16",
    })
  })

  it("declares no mode and no dependent bound, so no input applies only with another", () => {
    const ruled = motion.inputs.filter(
      (input) =>
        (input.type !== "seed" && input.when !== undefined) ||
        ("bounds" in input && input.bounds !== undefined)
    )
    expect(ruled).toEqual([])
  })

  it.each([
    { case: "no photo", given: { inputs: { clip: [clipId] } } },
    { case: "no clip", given: { inputs: { photo: [photoId] } } },
    {
      case: "two clips",
      given: { inputs: { photo: [photoId], clip: [clipId, clipId] } },
    },
    {
      case: "two photos",
      given: { inputs: { photo: [photoId, photoId], clip: [clipId] } },
    },
    {
      case: "a resolution of 1080p",
      given: { inputs: { ...both, resolution: "1080p" } },
    },
    {
      case: "a sound value of loud",
      given: { inputs: { ...both, sound: "loud" } },
    },
    {
      case: "a scene of 2001 characters",
      given: { inputs: { ...both, scene: "a".repeat(2001) } },
    },
    {
      case: "an input it does not declare",
      given: { inputs: { ...both, model: "x" } },
    },
    { case: "two outputs", given: { inputs: both, count: 2 } },
    {
      case: "a ratio it does not offer",
      given: { inputs: both, aspectRatio: "21:9" },
    },
  ])("refuses a run with $case", ({ given }) => {
    expect(isRefused(given)).toBe(true)
  })

  it("passes a scene of 2000 characters and each of the five ratios", () => {
    expect(isRefused({ inputs: { ...both, scene: "a".repeat(2000) } })).toBe(
      false
    )
    for (const aspectRatio of ["1:1", "4:3", "3:4", "16:9", "9:16"]) {
      expect(isRefused({ inputs: both, aspectRatio })).toBe(false)
    }
  })
})
