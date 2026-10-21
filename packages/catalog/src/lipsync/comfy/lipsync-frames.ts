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
  "1:1": { width: 512, height: 512 },
  "4:3": { width: 768, height: 576 },
  "3:4": { width: 576, height: 768 },
  "16:9": { width: 896, height: 512 },
  "9:16": { width: 512, height: 896 },
}

export const framesPerSecond = 24
export const framesPerLatent = 8
export const lengthStepsPerSecond = 25
export const shortestSeconds = 2
export const longestSeconds = 10
export const secondsStep = 1 / lengthStepsPerSecond

const firstPassDivisor = 2

const latentsPerSecond = framesPerSecond / framesPerLatent

function stepsOf(seconds: number): number {
  return Math.round(seconds * lengthStepsPerSecond)
}

export const lengthValues: readonly number[] = Array.from(
  {
    length: stepsOf(longestSeconds) - stepsOf(shortestSeconds) + 1,
  },
  (_, index) => (stepsOf(shortestSeconds) + index) / lengthStepsPerSecond
)

export function latentsFor(seconds: number): number {
  return Math.ceil((stepsOf(seconds) * latentsPerSecond) / lengthStepsPerSecond)
}

export function framesFor(seconds: number): number {
  return latentsFor(seconds) * framesPerLatent + 1
}

export function heldSecondsFor(seconds: number): number {
  return latentsFor(seconds) / latentsPerSecond
}

export function lengthMap(
  value: (seconds: number) => number
): Record<string, number> {
  return Object.fromEntries(
    lengthValues.map((seconds) => [String(seconds), value(seconds)])
  )
}

export function sizeMap(side: keyof FrameSize): Record<string, number> {
  return Object.fromEntries(
    lipsyncAspects.map((aspect) => [aspect, lipsyncSizes[aspect][side]])
  )
}

export function latentSizeMap(side: keyof FrameSize): Record<string, number> {
  return Object.fromEntries(
    lipsyncAspects.map((aspect) => [
      aspect,
      lipsyncSizes[aspect][side] / firstPassDivisor,
    ])
  )
}
