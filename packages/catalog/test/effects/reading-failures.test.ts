import { describe, expect, it } from "vitest"
import type { VideoReading } from "#effects/effect-recipe.contract"
import { recipeOf } from "#effects/effect-recipes"
import { readingFailures } from "#effects/reading-failures"
import { readingFor } from "./passed-recipe"

const at720 = { resolution: "720p", aspectRatio: "3:4" } as const

function failuresOf(effect: string, change: Partial<VideoReading>): string[] {
  const recipe = recipeOf(effect)
  const reading = { ...readingFor(recipe, "720p", "3:4"), ...change }
  return readingFailures(recipe, reading, at720)
}

describe("a run's video reading held against its look's criteria", () => {
  it("holds a reading at the look's length, the shape's pixel area, its cuts, its loudness band and its last frame", () => {
    for (const effect of ["grow-giant", "push-into-eye", "many-copies"]) {
      const failures = failuresOf(effect, {})
      expect({ effect, failures }).toEqual({ effect, failures: [] })
    }
  })

  it("names a length and a frame rate the look does not hold", () => {
    expect(failuresOf("grow-giant", { frames: 121, fps: 25 })).toEqual([
      "length: 121 frames, against 241",
      "frame rate: 25, against 24",
    ])
  })

  it("names a frame that keeps the 720p height but not the pixel area of its shape", () => {
    const recipe = recipeOf("push-into-eye")
    const reading = {
      ...readingFor(recipe, "720p", "16:9"),
      width: 1280,
      height: 704,
    }
    const run = { resolution: "720p", aspectRatio: "16:9" } as const
    expect(readingFailures(recipe, reading, run)).toEqual([
      "shape: 1280 by 704, against 16:9",
      "pixel area: 901120, against 921600 at 720p",
    ])
  })

  it("names a cut plan that misses a window or adds a cut", () => {
    expect(failuresOf("grow-giant", { cuts: [3.8] })).toEqual([
      "cut: none between 6.7 s and 7.5 s",
    ])
    expect(failuresOf("grow-giant", { cuts: [3.8, 5.2, 7.1] })).toEqual([
      "cut: one at 5.2 s, outside every window",
    ])
  })

  it("lets a look end on its optional cut, and only inside its window", () => {
    expect(failuresOf("scatter-petals", { cuts: [4.6] })).toEqual([])
    expect(failuresOf("scatter-petals", { cuts: [3.2] })).toEqual([
      "cut: one at 3.2 s, outside every window",
    ])
  })

  it("names a loudness outside the band, a peak over its ceiling, and a track on a silent look", () => {
    const loudness = { integrated: -14, truePeak: -1 }
    expect(failuresOf("push-into-eye", { loudness })).toEqual([
      "loudness: -14 LUFS, against -28.5 to -19",
      "true peak: -1 dBTP, against at most -3",
    ])
    expect(failuresOf("push-into-eye", { loudness: null })).toEqual([
      "sound: no track, against a sound bed",
    ])
    expect(failuresOf("buildings-ripple", { loudness })).toEqual([
      "sound: a track, against none",
    ])
  })

  it("names a first frame at the black floor, which is not the photo", () => {
    expect(failuresOf("many-copies", { firstFrameLuma: 17.5 })).toEqual([
      "first frame: luma 17.5, a black start against the photo",
    ])
    expect(failuresOf("many-copies", { firstFrameLuma: 18 })).toEqual([])
  })

  it("names a black start of a look that opens on its edited frame and lands on the photo", () => {
    expect(failuresOf("pull-back-to-space", { firstFrameLuma: 4 })).toEqual([
      "first frame: luma 4, a black start against the look's opening frame",
    ])
    expect(failuresOf("pull-back-to-space", {})).toEqual([])
  })

  it("names a last frame brighter than the look's black end", () => {
    expect(failuresOf("push-into-eye", { lastFrameLuma: 40 })).toEqual([
      "last frame: luma 40, against at most 17.5",
    ])
  })
})
