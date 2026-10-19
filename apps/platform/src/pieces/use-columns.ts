import { useEffect, useState } from "react"

function pixels(element: Element, name: string, fallback: number): number {
  const value = Number.parseFloat(
    getComputedStyle(element).getPropertyValue(name)
  )
  return Number.isFinite(value) ? value : fallback
}

function columnsOf(element: HTMLElement): number {
  const tile = pixels(element, "--spacing-tile", 99)
  const gap = pixels(element, "--spacing-s2", 7)
  return Math.max(1, Math.floor((element.clientWidth + gap) / (tile + gap)))
}

export function useGridColumns(): [(node: HTMLElement | null) => void, number] {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [columns, setColumns] = useState(4)
  useEffect(() => {
    if (node === null || typeof ResizeObserver === "undefined") {
      return
    }
    setColumns(columnsOf(node))
    const observer = new ResizeObserver(() => setColumns(columnsOf(node)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode, columns]
}
