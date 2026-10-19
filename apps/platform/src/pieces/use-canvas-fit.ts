import { useEffect, useState } from "react"

export type CanvasFit = {
  ref: (node: HTMLElement | null) => void
  isScrolled: boolean
}

function contentHeight(element: HTMLElement): number {
  const style = getComputedStyle(element)
  return (
    element.clientHeight -
    Number.parseFloat(style.paddingTop) -
    Number.parseFloat(style.paddingBottom)
  )
}

export function useCanvasFit(): CanvasFit {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [isScrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (node === null) {
      return
    }
    const fit = (): void => {
      node.style.setProperty("--canvas-height", `${contentHeight(node)}px`)
    }
    const scrolled = (): void => setScrolled(node.scrollTop > 0)
    fit()
    scrolled()
    node.addEventListener("scroll", scrolled, { passive: true })
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit)
    observer?.observe(node)
    return () => {
      node.removeEventListener("scroll", scrolled)
      observer?.disconnect()
    }
  }, [node])
  return { ref: setNode, isScrolled }
}
