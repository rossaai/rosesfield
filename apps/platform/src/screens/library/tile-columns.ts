import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useEffect, useState } from "react"

export type TileStep = { width: number; className: string }

export const tileSteps: readonly TileStep[] = [
  { width: 194, className: "w-48.5" },
  { width: 228, className: "w-57" },
  { width: 464, className: "w-116" },
]

export const phoneColumns: readonly number[] = [3, 2, 1]

export const phoneTile: TileStep = { width: 160, className: "w-40" }

export const tileGap = 7

export function stepOf<T>(steps: readonly T[], size: number): T {
  const index = Math.min(steps.length - 1, Math.max(0, Math.round(size)))
  const step = steps[index] ?? steps[0]
  if (step === undefined) {
    throw new Error("a step list holds at least one step")
  }
  return step
}

export function tileStepOf(size: number, isRegular: boolean): TileStep {
  return isRegular ? stepOf(tileSteps, size) : phoneTile
}

export function columnCount(
  available: number,
  tile: TileStep,
  isRegular: boolean,
  size = 1
): number {
  if (!isRegular) {
    return stepOf(phoneColumns, size)
  }
  return Math.max(1, Math.floor((available + tileGap) / (tile.width + tileGap)))
}

export type ColumnLayout = { count: number; fills: boolean }

export function columnLayout(
  items: number,
  available: number,
  tile: TileStep,
  isRegular: boolean,
  size = 1
): ColumnLayout {
  const fit = columnCount(available, tile, isRegular, size)
  return { count: Math.max(1, Math.min(fit, items)), fills: items >= fit }
}

export function packColumns<T>(
  items: readonly T[],
  count: number,
  aspectOf: (item: T) => MediaAspect
): T[][] {
  const columns: T[][] = Array.from({ length: Math.max(1, count) }, () => [])
  const heights: number[] = columns.map(() => 0)
  for (const item of items) {
    let shortest = 0
    for (const [index, height] of heights.entries()) {
      if (height < (heights[shortest] ?? 0)) {
        shortest = index
      }
    }
    const aspect = aspectOf(item)
    columns[shortest]?.push(item)
    heights[shortest] = (heights[shortest] ?? 0) + aspect.height / aspect.width
  }
  return columns
}

export function useAvailableWidth(): [
  (node: HTMLElement | null) => void,
  number,
] {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerWidth
  )
  useEffect(() => {
    if (node === null || typeof ResizeObserver === "undefined") {
      return
    }
    setWidth(node.clientWidth)
    const observer = new ResizeObserver(() => setWidth(node.clientWidth))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode, width]
}
