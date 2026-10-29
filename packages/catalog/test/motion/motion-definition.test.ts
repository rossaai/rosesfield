import { startRunBodyFor } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { both, clipId, motion, photoId } from "./motion-replay"

function idOf(n: number): string {
  return assetIdFormat.parse(
    `${n.toString(16).padStart(2, "0")}a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c`
  )
}

const photos = (count: number): string[] =>
  Array.from({ length: count }, (_, at) => idOf(at + 10))

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
      aspectRatio: null,
    })
  })

  it("asks for the clip and its sound only with your own video, a sentence only where the engine reads one, the photo with a render model, 1080p only on the guided render, and the chain's inputs only with the model a chain fills", () => {
    const ruled = motion.inputs
      .filter(
        (input) =>
          (input.type !== "seed" && input.when !== undefined) ||
          ("bounds" in input && input.bounds !== undefined)
      )
      .map((input) => input.name)
    expect(ruled).toEqual([
      "firstFrame",
      "guide",
      "plannedScene",
      "photo",
      "clip",
      "frames",
      "mask",
      "endKey",
      "targets",
      "sound",
      "scene",
      "resolution",
    ])
  })

  it.each([
    { case: "no photo", given: { inputs: { clip: [clipId] } } },
    { case: "no clip", given: { inputs: { photo: [photoId] } } },
    {
      case: "two clips",
      given: { inputs: { photo: [photoId], clip: [clipId, clipId] } },
    },
    {
      case: "a resolution of 1080p on LTX 2.3 control",
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
  ])("refuses a run with $case", ({ given }) => {
    expect(isRefused(given)).toBe(true)
  })

  it("passes a scene of 2000 characters and records the shape of the input that sets the first frame, whatever it is", () => {
    expect(isRefused({ inputs: { ...both, scene: "a".repeat(2000) } })).toBe(
      false
    )
    for (const aspectRatio of ["2:3", "4:5", "9:16", "21:9"]) {
      expect(body.parse({ inputs: both, aspectRatio }).aspectRatio).toBe(
        aspectRatio
      )
    }
    expect(isRefused({ inputs: both, aspectRatio: "a:b" })).toBe(true)
  })

  it("opens on the LTX 2.5 guided render, which takes your video only through the chain, never in one run", () => {
    expect(isRefused({ inputs: { photo: [photoId], clip: [clipId] } })).toBe(
      true
    )
    const draft = {
      firstFrame: [idOf(1)],
      guide: [idOf(2)],
      mask: [idOf(3)],
      plannedScene: "A man walks down a street.",
      scene: "replace the man on the left",
      resolution: "480p",
    }
    expect(body.parse({ inputs: draft }).inputs.model).toBe("ltx-2-5-guide")
    expect(isRefused({ inputs: { ...draft, photo: [photoId] } })).toBe(true)
    expect(isRefused({ inputs: { ...draft, clip: [clipId] } })).toBe(true)
  })

  it("plans your video with 1 to 15 photos and its 4 frames, and refuses a 16th photo or a 5th frame", () => {
    const plan = (photoCount: number, frameCount: number) => ({
      inputs: {
        model: "motion-plan",
        clip: [clipId],
        photo: photos(photoCount),
        frames: photos(frameCount),
        scene: "replace the man on the left",
      },
      place: "held",
    })
    expect(isRefused(plan(1, 4))).toBe(false)
    expect(isRefused(plan(15, 4))).toBe(false)
    expect(isRefused(plan(16, 4))).toBe(true)
    expect(isRefused(plan(3, 5))).toBe(true)
    expect(isRefused(plan(0, 4))).toBe(true)
  })
})
