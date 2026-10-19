import { type RefObject, useLayoutEffect } from "react"

function isSizedByContent(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("field-sizing", "content")
}

function grow(element: HTMLTextAreaElement): void {
  element.style.height = "auto"
  element.style.height = `${element.scrollHeight}px`
}

export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>): void {
  useLayoutEffect(() => {
    const element = ref.current
    if (element !== null && !isSizedByContent()) {
      grow(element)
    }
  })
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null || isSizedByContent()) {
      return
    }
    const onInput = (): void => grow(element)
    element.addEventListener("input", onInput)
    return () => element.removeEventListener("input", onInput)
  }, [ref])
}
