import { describe, expect, it } from "vitest"
import { peaksOf, playedBarsOf } from "@/studio/audio/waveform"

describe("the waveform of a track", () => {
  it("gives each bar the loudest sample of its stretch, the loudest bar at 1", () => {
    const left = new Float32Array([
      0.125, -0.5, 0.25, 0.125, 0, 0, -0.0625, 0.125,
    ])
    expect(peaksOf([left], 4)).toEqual([1, 0.5, 0, 0.25])
  })

  it("reads every channel, so a sound on the right alone still shows", () => {
    const left = new Float32Array([0, 0, 0, 0])
    const right = new Float32Array([0, 0, 0.4, 0])
    expect(peaksOf([left, right], 2)).toEqual([0, 1])
  })

  it("draws a silent track flat and an empty one with no bars", () => {
    expect(peaksOf([new Float32Array(6)], 3)).toEqual([0, 0, 0])
    expect(peaksOf([], 3)).toEqual([])
  })

  it("lights the bars the playhead passed", () => {
    expect(playedBarsOf(0, 64)).toBe(0)
    expect(playedBarsOf(0.5, 64)).toBe(32)
    expect(playedBarsOf(1.2, 64)).toBe(64)
  })
})
