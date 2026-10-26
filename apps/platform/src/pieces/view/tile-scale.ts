import { feedColumnsOf } from "@rosesfield/ui/components/media-feed"

export type TileStep = {
  width: number
  className: string
  phoneColumns: number
  runColumns: number
}

export const tileScale: readonly TileStep[] = [
  { width: 160, className: "w-40", phoneColumns: 3, runColumns: 3 },
  { width: 228, className: "w-57", phoneColumns: 2, runColumns: 2 },
  { width: 320, className: "w-80", phoneColumns: 2, runColumns: 1 },
  { width: 464, className: "w-116", phoneColumns: 1, runColumns: 1 },
]

export const tileSizes = {
  min: 0,
  max: tileScale.length - 1,
  start: 1,
} as const

export const tileGap = 7

export function tileStepIndexOf(size: number): number {
  return Math.min(tileSizes.max, Math.max(tileSizes.min, Math.round(size)))
}

export function tileStepOf(size: number): TileStep {
  const step = tileScale[tileStepIndexOf(size)] ?? tileScale[tileSizes.start]
  if (step === undefined) {
    throw new Error("the tile scale holds its start step")
  }
  return step
}

export function runCardColumnsOf(size: number): number {
  return tileStepOf(size).runColumns
}

export function columnCount(
  available: number,
  size: number,
  isRegular: boolean
): number {
  const step = tileStepOf(size)
  return isRegular
    ? feedColumnsOf(Number.POSITIVE_INFINITY, available, step.width, tileGap)
        .count
    : step.phoneColumns
}

export type ColumnLayout = { count: number; fills: boolean }

export function columnLayout(
  items: number,
  available: number,
  size: number,
  isRegular: boolean
): ColumnLayout {
  const step = tileStepOf(size)
  return isRegular
    ? feedColumnsOf(items, available, step.width, tileGap)
    : feedColumnsOf(items, step.phoneColumns, 1, 0)
}

export function columnClassOf(size: number, isRegular: boolean): string {
  return tileStepOf(isRegular ? size : tileSizes.min).className
}
