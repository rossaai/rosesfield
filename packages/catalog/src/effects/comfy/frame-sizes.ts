import type { ResolutionValue } from "#motion/examples/library-example.contract"

export const effectRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const

export type EffectRatio = (typeof effectRatios)[number]

export type FrameSize = { width: number; height: number }

type SizeTable = Readonly<Record<EffectRatio, FrameSize>>

function table(short: number, wide: number, fourThree: number): SizeTable {
  return {
    "1:1": { width: short, height: short },
    "4:3": { width: fourThree, height: short },
    "3:4": { width: short, height: fourThree },
    "16:9": { width: wide, height: short },
    "9:16": { width: short, height: wide },
  }
}

export const ltxFrames = {
  fps: 24,
  sizes: {
    "480p": table(512, 896, 704),
    "720p": table(704, 1280, 960),
    "1080p": table(1088, 1920, 1472),
  } satisfies Readonly<Record<ResolutionValue, SizeTable>>,
}

export const deliveryArea: Readonly<Record<ResolutionValue, number>> = {
  "480p": 854 * 480,
  "720p": 1280 * 720,
  "1080p": 1920 * 1080,
}

export const deliveryFrames: Readonly<Record<ResolutionValue, SizeTable>> = {
  "480p": {
    "1:1": { width: 640, height: 640 },
    "4:3": { width: 738, height: 554 },
    "3:4": { width: 554, height: 738 },
    "16:9": { width: 854, height: 480 },
    "9:16": { width: 480, height: 854 },
  },
  "720p": {
    "1:1": { width: 960, height: 960 },
    "4:3": { width: 1110, height: 832 },
    "3:4": { width: 832, height: 1110 },
    "16:9": { width: 1280, height: 720 },
    "9:16": { width: 720, height: 1280 },
  },
  "1080p": {
    "1:1": { width: 1440, height: 1440 },
    "4:3": { width: 1664, height: 1248 },
    "3:4": { width: 1248, height: 1664 },
    "16:9": { width: 1920, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
  },
}

export function ratioOf(ratio: EffectRatio): number {
  const [width, height] = ratio.split(":").map(Number)
  return (width ?? 1) / (height ?? 1)
}

export function framesOf(seconds: number): number {
  return seconds * ltxFrames.fps + 1
}

export function audioFramesOf(seconds: number): number {
  return framesOf(seconds) + 1
}

export function frameAt(time: number): number {
  return Math.round(time * ltxFrames.fps)
}

export function sizeMap(
  sizes: SizeTable,
  side: keyof FrameSize,
  divisor = 1
): Record<string, number> {
  return Object.fromEntries(
    effectRatios.map((ratio) => [ratio, sizes[ratio][side] / divisor])
  )
}
