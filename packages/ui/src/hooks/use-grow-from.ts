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

type Box = { left: number; top: number; width: number; height: number }

export type GrowPose = { transform: string; clipPath: string }

const settled: GrowPose = {
  transform: "none",
  clipPath: "inset(0px 0px 0px 0px round 0px)",
}

export function isOnScreen(rect: Box): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top + rect.height > 0 &&
    rect.left + rect.width > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  )
}

export function originBoxOf(origin: HTMLElement): HTMLElement {
  return origin.closest<HTMLElement>("[data-slot='media']") ?? origin
}

export type OriginShape = {
  kind: "image" | "video"
  width: number
  height: number
}

function naturalShapeOf(media: Element | null): OriginShape | null {
  if (media instanceof HTMLVideoElement) {
    const { videoWidth: width, videoHeight: height } = media
    return width > 0 && height > 0 ? { kind: "video", width, height } : null
  }
  if (media instanceof HTMLImageElement) {
    const { naturalWidth: width, naturalHeight: height } = media
    return width > 0 && height > 0 ? { kind: "image", width, height } : null
  }
  return null
}

export function originShapeOf(origin: HTMLElement | null): OriginShape | null {
  if (origin === null) {
    return null
  }
  const box = originBoxOf(origin)
  const media = box.matches("img, video")
    ? box
    : box.querySelector("video, img")
  return naturalShapeOf(media)
}

export function growScaleOf(
  from: Pick<Box, "width" | "height">,
  target: Pick<Box, "width" | "height">
): number {
  return Math.min(
    1,
    Math.max(from.width / target.width, from.height / target.height)
  )
}

export function growPoseOf(
  from: Box,
  frame: Box,
  target: Box,
  radius: number
): GrowPose {
  const scale = growScaleOf(from, target)
  const centreX = target.left - frame.left + target.width / 2
  const centreY = target.top - frame.top + target.height / 2
  const x = from.left + from.width / 2 - frame.left - scale * centreX
  const y = from.top + from.height / 2 - frame.top - scale * centreY
  const halfWidth = from.width / scale / 2
  const halfHeight = from.height / scale / 2
  const top = centreY - halfHeight
  const left = centreX - halfWidth
  const right = frame.width - centreX - halfWidth
  const bottom = frame.height - centreY - halfHeight
  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius / scale}px)`,
  }
}

function radiusOf(element: HTMLElement): number {
  const value = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)
  return Number.isFinite(value) ? value : 0
}

function settle(node: HTMLElement): void {
  if (typeof node.getAnimations === "function") {
    for (const running of node.getAnimations()) {
      running.cancel()
    }
  }
}

function originPose(
  origin: HTMLElement | null,
  frame: HTMLElement
): GrowPose | null {
  if (origin === null || !origin.isConnected) {
    return null
  }
  const box = originBoxOf(origin)
  const from = box.getBoundingClientRect()
  settle(frame)
  const to = frame.getBoundingClientRect()
  const target =
    frame
      .querySelector<HTMLElement>("[data-grow-target]")
      ?.getBoundingClientRect() ?? to
  if (!isOnScreen(from) || to.width === 0 || target.width === 0) {
    return null
  }
  return growPoseOf(from, to, target, radiusOf(box))
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

function isStill(phase: MotionPhase): boolean {
  return readMotion("layer", phase, "transform").duration === 0
}

function grow(
  frame: HTMLElement,
  origin: HTMLElement | null,
  phase: MotionPhase
): Animation | null {
  const from = isStill(phase) ? null : originPose(origin, frame)
  if (from === null) {
    settle(frame)
    return fade(frame, phase)
  }
  return play(frame, [{ ...from }, { ...settled }], phase, "transform")
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
