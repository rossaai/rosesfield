import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useState,
} from "react"

export type ScrollEnds = { start: boolean; end: boolean }

const none: ScrollEnds = { start: false, end: false }

export function readScrollEnds(element: HTMLElement): ScrollEnds {
  return {
    start: element.scrollLeft > 0,
    end: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
  }
}

export function edgeMaskOf(ends: ScrollEnds, fade: string): CSSProperties {
  const start = ends.start ? `transparent, black ${fade}` : "black, black"
  const end = ends.end ? `black calc(100% - ${fade}), transparent` : "black"
  const image = `linear-gradient(to right, ${start}, ${end})`
  return { maskImage: image, WebkitMaskImage: image }
}

export function useScrollEnds(row: RefObject<HTMLElement | null>): {
  ends: ScrollEnds
  update: () => void
} {
  const [ends, setEnds] = useState<ScrollEnds>(none)
  const update = useCallback(() => {
    const element = row.current
    if (element === null) {
      return
    }
    const next = readScrollEnds(element)
    setEnds((was) =>
      was.start === next.start && was.end === next.end ? was : next
    )
  }, [row])
  useEffect(() => {
    const element = row.current
    if (element === null) {
      return
    }
    update()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update)
      return () => window.removeEventListener("resize", update)
    }
    const sizes = new ResizeObserver(update)
    sizes.observe(element)
    for (const child of element.children) {
      sizes.observe(child)
    }
    return () => sizes.disconnect()
  }, [row, update])
  return { ends, update }
}
