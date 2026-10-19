export type LipsyncAspect = "1:1" | "4:3" | "3:4" | "16:9" | "9:16"

export type FrameSize = {
  width: number
  height: number
}

export const lipsyncAspects: readonly LipsyncAspect[] = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
]

export const lipsyncSizes: Readonly<Record<LipsyncAspect, FrameSize>> = {
  "1:1": { width: 480, height: 480 },
  "4:3": { width: 640, height: 480 },
  "3:4": { width: 480, height: 640 },
  "16:9": { width: 832, height: 480 },
  "9:16": { width: 480, height: 832 },
}

export const framesPerSecond = 25
export const motionFrames = 9
export const passCount = 4
export const shortestSeconds = 2
export const longestSeconds = 10
export const secondsStep = 1 / framesPerSecond

const shortestWindow = 13

export function frameCountOf(seconds: number): number {
  return Math.round(seconds * framesPerSecond)
}

export function secondsOf(frames: number): number {
  return frames / framesPerSecond
}

export const lengthValues: readonly number[] = Array.from(
  {
    length: frameCountOf(longestSeconds) - frameCountOf(shortestSeconds) + 1,
  },
  (_, index) => secondsOf(frameCountOf(shortestSeconds) + index)
)

export function windowOf(frames: number): number {
  const carried = (passCount - 1) * motionFrames
  const least = Math.ceil((frames + carried) / passCount)
  const onStep = least + ((((1 - least) % 4) + 4) % 4)
  return Math.max(shortestWindow, onStep)
}

export function framesMadeBy(window: number): number {
  return passCount * window - (passCount - 1) * motionFrames
}

export function lengthMap(
  frameValue: (frames: number) => number
): Record<string, number> {
  return Object.fromEntries(
    lengthValues.map((seconds) => [
      String(seconds),
      frameValue(frameCountOf(seconds)),
    ])
  )
}

export function sizeMap(side: keyof FrameSize): Record<string, number> {
  return Object.fromEntries(
    lipsyncAspects.map((aspect) => [aspect, lipsyncSizes[aspect][side]])
  )
}
