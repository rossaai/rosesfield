import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useEffect, useState } from "react"

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
