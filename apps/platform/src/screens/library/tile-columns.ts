import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useEffect, useState } from "react"

export type TileStep = { width: number; className: string }

export const tileSteps: readonly TileStep[] = [
  { width: 180, className: "w-45" },
  { width: 228, className: "w-57" },
  { width: 280, className: "w-70" },
  { width: 340, className: "w-85" },
  { width: 420, className: "w-105" },
]

export const phoneTile: TileStep = { width: 300, className: "w-75" }

export const tileGap = 8

export const thumbSteps: readonly string[] = [
  "size-thumb",
  "size-18",
  "size-22",
  "size-26",
  "size-30",
]

export const squareSteps: readonly string[] = [
  "grid-cols-[repeat(auto-fill,minmax(var(--spacing-tile),1fr))]",
  "grid-cols-[repeat(auto-fill,minmax(--spacing(32),1fr))]",
  "grid-cols-[repeat(auto-fill,minmax(--spacing(40),1fr))]",
  "grid-cols-[repeat(auto-fill,minmax(--spacing(50),1fr))]",
  "grid-cols-[repeat(auto-fill,minmax(--spacing(60),1fr))]",
]

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
  isRegular: boolean
): number {
  if (!isRegular) {
    return 1
  }
  return Math.max(1, Math.floor((available + tileGap) / (tile.width + tileGap)))
}

export type ColumnLayout = { count: number; fills: boolean }

export function columnLayout(
  items: number,
  available: number,
  tile: TileStep,
  isRegular: boolean
): ColumnLayout {
  const fit = columnCount(available, tile, isRegular)
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
