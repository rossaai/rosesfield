export type KeyframeSize = {
  width: number
  height: number
}

export const keyframeSizes: Readonly<Record<string, KeyframeSize>> = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1152, height: 864 },
  "3:4": { width: 864, height: 1152 },
  "16:9": { width: 1360, height: 768 },
  "9:16": { width: 768, height: 1360 },
}

export const keyframeAspects: readonly string[] = Object.keys(keyframeSizes)

export function sideMap(side: keyof KeyframeSize): Record<string, number> {
  return Object.fromEntries(
    Object.entries(keyframeSizes).map(([ratio, size]) => [ratio, size[side]])
  )
}
