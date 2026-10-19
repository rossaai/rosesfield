export const effectRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const

export type EffectRatio = (typeof effectRatios)[number]

export const resolutionValues = ["480p", "720p"] as const

export type ResolutionValue = (typeof resolutionValues)[number]

export const lengthValues = [3, 4, 5] as const

export type FrameSize = { width: number; height: number }

type SizeTable = Readonly<Record<EffectRatio, FrameSize>>

export type ModelFrames = {
  fps: number
  frames: Readonly<Record<string, number>>
  sizes: Readonly<Record<ResolutionValue, SizeTable>>
}

function table(short: number, wide: number, fourThree: number): SizeTable {
  return {
    "1:1": { width: short, height: short },
    "4:3": { width: fourThree, height: short },
    "3:4": { width: short, height: fourThree },
    "16:9": { width: wide, height: short },
    "9:16": { width: short, height: wide },
  }
}

export const ltxFrames: ModelFrames = {
  fps: 24,
  frames: { "3": 73, "4": 97, "5": 121 },
  sizes: { "480p": table(512, 896, 704), "720p": table(704, 1280, 960) },
}

export function sizeMap(
  sizes: SizeTable,
  side: keyof FrameSize,
  divisor: number
): Record<string, number> {
  return Object.fromEntries(
    effectRatios.map((ratio) => [ratio, sizes[ratio][side] / divisor])
  )
}
