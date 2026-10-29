import {
  deliveryArea,
  type EffectRatio,
  effectRatios,
  framesOf,
  ltxFrames,
  ratioOf,
} from "#effects/comfy/frame-sizes"
import type {
  CutWindow,
  LibraryExample,
  ResolutionValue,
  VideoReading,
} from "#motion/examples/library-example.contract"

export type ReadingRun = {
  resolution: ResolutionValue
  aspectRatio: string
}

const tolerance = 0.01

const blackFloor = 17.5

function isRatio(value: string): value is EffectRatio {
  return effectRatios.some((ratio) => ratio === value)
}

function isWithin(value: number, target: number): boolean {
  return Math.abs(value - target) <= target * tolerance
}

function lengthFailures(
  recipe: LibraryExample,
  reading: VideoReading
): string[] {
  const failures: string[] = []
  if (Math.abs(reading.frames - framesOf(recipe.seconds)) > 1) {
    failures.push(
      `length: ${reading.frames} frames, against ${framesOf(recipe.seconds)}`
    )
  }
  if (Math.abs(reading.fps - ltxFrames.fps) > 0.01) {
    failures.push(`frame rate: ${reading.fps}, against ${ltxFrames.fps}`)
  }
  return failures
}

function frameFailures(reading: VideoReading, run: ReadingRun): string[] {
  const failures: string[] = []
  if (!isRatio(run.aspectRatio)) {
    return [`shape: ${run.aspectRatio} is not a shape Effects offers`]
  }
  const ratio = reading.width / reading.height
  if (!isWithin(ratio, ratioOf(run.aspectRatio))) {
    failures.push(
      `shape: ${reading.width} by ${reading.height}, against ${run.aspectRatio}`
    )
  }
  const area = reading.width * reading.height
  if (!isWithin(area, deliveryArea[run.resolution])) {
    failures.push(
      `pixel area: ${area}, against ${deliveryArea[run.resolution]} at ${run.resolution}`
    )
  }
  return failures
}

function cutFailures(
  windows: readonly CutWindow[],
  cuts: readonly number[]
): string[] {
  const failures: string[] = []
  const pending = [...cuts]
  for (const window of windows) {
    const inside = pending.findIndex(
      (cut) => cut >= window.min && cut <= window.max
    )
    if (inside >= 0) {
      pending.splice(inside, 1)
    } else if (window.kind === "cut") {
      failures.push(`cut: none between ${window.min} s and ${window.max} s`)
    }
  }
  for (const cut of pending) {
    failures.push(`cut: one at ${cut} s, outside every window`)
  }
  return failures
}

function soundFailures(
  recipe: LibraryExample,
  reading: VideoReading
): string[] {
  const sound = recipe.design.sound
  const loudness = reading.loudness
  if (sound === null) {
    return loudness === null ? [] : ["sound: a track, against none"]
  }
  if (loudness === null) {
    return ["sound: no track, against a sound bed"]
  }
  const failures: string[] = []
  const band = sound.loudness
  if (loudness.integrated < band.min || loudness.integrated > band.max) {
    failures.push(
      `loudness: ${loudness.integrated} LUFS, against ${band.min} to ${band.max}`
    )
  }
  if (loudness.truePeak > sound.truePeakMax) {
    failures.push(
      `true peak: ${loudness.truePeak} dBTP, against at most ${sound.truePeakMax}`
    )
  }
  return failures
}

function lastFrameFailures(
  recipe: LibraryExample,
  reading: VideoReading
): string[] {
  const maxLuma = recipe.design.lastFrame.maxLuma
  return maxLuma === null || reading.lastFrameLuma <= maxLuma
    ? []
    : [`last frame: luma ${reading.lastFrameLuma}, against at most ${maxLuma}`]
}

function firstFrameFailures(
  recipe: LibraryExample,
  reading: VideoReading
): string[] {
  const opening =
    recipe.photoFrame === "first" ? "the photo" : "the look's opening frame"
  return reading.firstFrameLuma > blackFloor
    ? []
    : [
        `first frame: luma ${reading.firstFrameLuma}, a black start against ${opening}`,
      ]
}

export function readingFailures(
  recipe: LibraryExample,
  reading: VideoReading,
  run: ReadingRun
): string[] {
  return [
    ...lengthFailures(recipe, reading),
    ...frameFailures(reading, run),
    ...firstFrameFailures(recipe, reading),
    ...cutFailures(recipe.design.cuts, reading.cuts),
    ...soundFailures(recipe, reading),
    ...lastFrameFailures(recipe, reading),
  ]
}
