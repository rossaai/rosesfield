import { type RefObject, useEffect, useRef } from "react"

export function useInView(
  ref: RefObject<Element | null>,
  onChange: (isInView: boolean) => void
): void {
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })
  useEffect(() => {
    const element = ref.current
    if (element === null || typeof IntersectionObserver === "undefined") {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        latest.current(entry.isIntersecting)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
}
