import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useEffect, useState } from "react"

export type TileStep = { width: number; className: string }

export const tileSteps: readonly TileStep[] = [
  { width: 240, className: "w-60" },
  { width: 280, className: "w-70" },
  { width: 330, className: "w-82.5" },
  { width: 380, className: "w-95" },
  { width: 420, className: "w-105" },
]

export const phoneTile: TileStep = { width: 300, className: "w-75" }

export const tileGap = 16

const rowBudget = 3 * 330 + 2 * tileGap

export function tileStepOf(size: number, isRegular: boolean): TileStep {
  if (!isRegular) {
    return phoneTile
  }
  const index = Math.min(tileSteps.length - 1, Math.max(0, Math.round(size)))
  return tileSteps[index] ?? phoneTile
}

export function columnCount(
  available: number,
  tile: TileStep,
  isRegular: boolean
): number {
  if (!isRegular) {
    return 1
  }
  const width = Math.min(available, rowBudget)
  return Math.max(1, Math.floor((width + tileGap) / (tile.width + tileGap)))
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
  const [width, setWidth] = useState(rowBudget)
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
