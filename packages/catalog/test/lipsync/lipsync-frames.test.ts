import { describe, expect, it } from "vitest"
import {
  framesFor,
  framesPerSecond,
  heldSecondsFor,
  latentSizeMap,
  lengthValues,
  sizeMap,
} from "#lipsync/comfy/lipsync-frames"

const latentFrames = 8
const mostOver = 1 / 3 + 1 / framesPerSecond

function frameMisses(made: (seconds: number) => number): string[] {
  return lengthValues.flatMap((seconds) => {
    const frames = made(seconds)
    const shown = frames / framesPerSecond
    const fits =
      (frames - 1) % latentFrames === 0 &&
      (frames - 1) / framesPerSecond >= seconds &&
      shown - seconds <= mostOver
    return fits ? [] : [`${seconds} s: ${frames} frames`]
  })
}

describe("the LTX 2.3 frames for each length", () => {
  it("makes 8 n + 1 frames that hold the whole audio at every length", () => {
    expect(lengthValues).toHaveLength(201)
    expect(frameMisses(framesFor)).toEqual([])
  })

  it("makes a video of 5 seconds within 0.25 seconds from 5 seconds of audio, and holds all of it", () => {
    expect(framesFor(5)).toBe(121)
    expect(Math.abs(framesFor(5) / framesPerSecond - 5)).toBeLessThan(0.25)
    expect(heldSecondsFor(5)).toBe(5)
    expect(heldSecondsFor(5.32)).toBeCloseTo(16 / 3)
    expect(framesFor(2)).toBe(49)
    expect(framesFor(10)).toBe(241)
  })

  it("keeps the audio no shorter than its length and no longer than the frames it fills", () => {
    const misses = lengthValues.filter((seconds) => {
      const held = heldSecondsFor(seconds)
      return (
        held < seconds || held !== (framesFor(seconds) - 1) / framesPerSecond
      )
    })
    expect(misses).toEqual([])
  })

  it("halves each side for the first stage, on a size the latent takes", () => {
    const width = sizeMap("width")
    const latent = latentSizeMap("width")
    expect(width["1:1"]).toBe(512)
    expect(latent["1:1"]).toBe(256)
    expect(sizeMap("height")["9:16"]).toBe(896)
    expect(latentSizeMap("height")["9:16"]).toBe(448)
    const offStep = Object.values(latent).filter((side) => side % 32 !== 0)
    expect(offStep).toEqual([])
  })
})

describe("the control of the frame check", () => {
  it("flags frame counts rounded to the nearest 8 or counted at 25 frames a second", () => {
    const nearest = (seconds: number) =>
      Math.round((seconds * framesPerSecond) / latentFrames) * latentFrames + 1
    const atTwentyFive = (seconds: number) => Math.round(seconds * 25) + 1
    expect(frameMisses(nearest).length).toBeGreaterThan(0)
    expect(frameMisses(atTwentyFive).length).toBeGreaterThan(0)
  })
})
