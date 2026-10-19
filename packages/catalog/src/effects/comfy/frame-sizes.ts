import type { ResolutionValue } from "#effects/effect-recipe.contract"

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
  } satisfies Readonly<Record<ResolutionValue, SizeTable>>,
}

export function framesOf(seconds: number): number {
  return seconds * ltxFrames.fps + 1
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
