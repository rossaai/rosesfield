import { type TouchEvent, useRef } from "react"

export const longPressMs = 500
const moveLimit = 10

type LongPressHandlers = {
  onTouchStart: (event: TouchEvent<HTMLElement>) => void
  onTouchMove: (event: TouchEvent<HTMLElement>) => void
  onTouchEnd: () => void
  onTouchCancel: () => void
}

function swallowNextClick(): void {
  const stop = (event: MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
  }
  window.addEventListener("click", stop, { capture: true, once: true })
  window.setTimeout(
    () => window.removeEventListener("click", stop, { capture: true }),
    longPressMs
  )
}

export function useLongPress(onLongPress: () => void): LongPressHandlers {
  const timer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const clear = (): void => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }
  return {
    onTouchStart: (event) => {
      const [touch] = Array.from(event.touches)
      if (touch === undefined || event.touches.length !== 1) {
        clear()
        return
      }
      origin.current = { x: touch.clientX, y: touch.clientY }
      clear()
      timer.current = window.setTimeout(() => {
        timer.current = null
        swallowNextClick()
        onLongPress()
      }, longPressMs)
    },
    onTouchMove: (event) => {
      const [touch] = Array.from(event.touches)
      const start = origin.current
      if (
        touch !== undefined &&
        start !== null &&
        Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > moveLimit
      ) {
        clear()
      }
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
  }
}
