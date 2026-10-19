export type ImageSize = {
  width: number
  height: number
}

export type SizeTable = Readonly<Record<string, ImageSize>>

export const sizesAt1k: SizeTable = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1152, height: 864 },
  "3:4": { width: 864, height: 1152 },
  "16:9": { width: 1360, height: 768 },
  "9:16": { width: 768, height: 1360 },
}

export const sizesAt2k: SizeTable = {
  "1:1": { width: 2048, height: 2048 },
  "4:3": { width: 2048, height: 1536 },
  "3:4": { width: 1536, height: 2048 },
  "16:9": { width: 2048, height: 1152 },
  "9:16": { width: 1152, height: 2048 },
}

export const qwenSizes: SizeTable = {
  "1:1": { width: 1328, height: 1328 },
  "4:3": { width: 1472, height: 1104 },
  "3:4": { width: 1104, height: 1472 },
  "16:9": { width: 1664, height: 928 },
  "9:16": { width: 928, height: 1664 },
}

export function widthsOf(table: SizeTable): Record<string, number> {
  return Object.fromEntries(
    Object.entries(table).map(([ratio, size]) => [ratio, size.width])
  )
}

export function heightsOf(table: SizeTable): Record<string, number> {
  return Object.fromEntries(
    Object.entries(table).map(([ratio, size]) => [ratio, size.height])
  )
}
