import { type MotionPhase, readMotion } from "@rosesfield/ui/motion"
import {
  type RefCallback,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

type GrowFrom = {
  isMounted: boolean
  frameRef: RefCallback<HTMLElement>
  fadeRef: RefCallback<HTMLElement>
}

function isOnScreen(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  )
}

function originTransform(
  origin: HTMLElement | null,
  frame: HTMLElement
): string | null {
  if (origin === null || !origin.isConnected) {
    return null
  }
  const from = origin.getBoundingClientRect()
  const to = frame.getBoundingClientRect()
  if (!isOnScreen(from) || to.width === 0 || to.height === 0) {
    return null
  }
  const x = from.left - to.left
  const y = from.top - to.top
  const scale = `scale(${from.width / to.width}, ${from.height / to.height})`
  return `translate(${x}px, ${y}px) ${scale}`
}

function play(
  node: HTMLElement,
  keyframes: Keyframe[],
  phase: MotionPhase,
  track: "transform" | "opacity"
): Animation | null {
  if (typeof node.animate !== "function") {
    return null
  }
  const ordered = phase === "in" ? keyframes : [...keyframes].reverse()
  const timing = readMotion("layer", phase, track)
  return node.animate(ordered, { ...timing, fill: "both" })
}

function fade(node: HTMLElement, phase: MotionPhase): Animation | null {
  return play(node, [{ opacity: 0 }, { opacity: 1 }], phase, "opacity")
}

function grow(
  frame: HTMLElement,
  origin: HTMLElement | null,
  phase: MotionPhase
): Animation | null {
  const from = originTransform(origin, frame)
  if (from === null) {
    return fade(frame, phase)
  }
  return play(
    frame,
    [{ transform: from }, { transform: "none" }],
    phase,
    "transform"
  )
}

function leave(
  frame: HTMLElement | null,
  fades: Set<HTMLElement>,
  origin: HTMLElement | null
): Promise<unknown> {
  const running = [...fades].map((node) => fade(node, "out"))
  if (frame !== null) {
    running.push(grow(frame, origin, "out"))
  }
  return Promise.allSettled(
    running.flatMap((item) => (item === null ? [] : [item.finished]))
  )
}

function useFadeRef(
  fades: RefObject<Set<HTMLElement>>,
  phase: RefObject<MotionPhase>
): RefCallback<HTMLElement> {
  return useCallback<RefCallback<HTMLElement>>(
    (node) => {
      if (node === null) {
        return
      }
      fades.current.add(node)
      if (phase.current === "in") {
        fade(node, "in")
      }
      return () => {
        fades.current.delete(node)
      }
    },
    [fades, phase]
  )
}

export function useGrowFrom(
  open: boolean,
  origin: RefObject<HTMLElement | null>
): GrowFrom {
  const [isMounted, setMounted] = useState(open)
  const frame = useRef<HTMLElement | null>(null)
  const fades = useRef(new Set<HTMLElement>())
  const phase = useRef<MotionPhase>("out")
  const enter = useCallback(() => {
    if (frame.current === null || phase.current === "in") {
      return
    }
    phase.current = "in"
    grow(frame.current, origin.current, "in")
    for (const node of fades.current) {
      fade(node, "in")
    }
  }, [origin])
  useEffect(() => {
    if (open) {
      setMounted(true)
      enter()
      return
    }
    phase.current = "out"
    let isCurrent = true
    void leave(frame.current, fades.current, origin.current).then(() => {
      if (isCurrent) {
        setMounted(false)
      }
    })
    return () => {
      isCurrent = false
    }
  }, [open, origin, enter])
  const frameRef = useCallback<RefCallback<HTMLElement>>(
    (node) => {
      frame.current = node
      enter()
      return () => {
        frame.current = null
        phase.current = "out"
      }
    },
    [enter]
  )
  const fadeRef = useFadeRef(fades, phase)
  return { isMounted, frameRef, fadeRef }
}
