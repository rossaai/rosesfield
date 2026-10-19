export const backgrounds = [
  "white",
  "grey",
  "dark",
  "office",
  "outdoor",
] as const

export const clothesValues = ["keep", "plain-top", "shirt", "jacket"] as const

export const framings = ["close", "standard", "wide"] as const

export const headshotRatios = ["1:1", "3:4", "4:3"] as const

export type Background = (typeof backgrounds)[number]
export type Clothes = (typeof clothesValues)[number]
export type Framing = (typeof framings)[number]
export type HeadshotRatio = (typeof headshotRatios)[number]
export type Glasses = "on" | "off"

export type ImageSize = { width: number; height: number }

export const headshotSizes: Readonly<Record<HeadshotRatio, ImageSize>> = {
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 896, height: 1152 },
  "4:3": { width: 1152, height: 896 },
}

export const maxHeadshots = 4
export const defaultHeadshots = 2

export const seedSpan = 2_147_483_648

export const photoLimits = {
  formats: ["image/png", "image/jpeg", "image/webp"],
  largestBytes: 20_000_000,
  shortestSide: 512,
  widestRatio: 16 / 9,
} as const

export function keyOf(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, next: string) => next.toUpperCase())
}

export function seedOf(seed: number, index: number): number {
  return (seed + index) % seedSpan
}
