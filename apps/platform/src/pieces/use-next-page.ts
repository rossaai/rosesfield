import { useEffect, useState } from "react"

export function useNextPage(
  hasNext: boolean,
  fetchNext: () => void
): (node: HTMLElement | null) => void {
  const [node, setNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (
      node === null ||
      !hasNext ||
      typeof IntersectionObserver === "undefined"
    ) {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        fetchNext()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, hasNext, fetchNext])
  return setNode
}
