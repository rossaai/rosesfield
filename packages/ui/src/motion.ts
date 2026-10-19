export type MotionPreset =
  | "press"
  | "pressRound"
  | "tint"
  | "popover"
  | "layer"
  | "scrim"
  | "enter"
  | "control"
  | "pane"
  | "pulse"

export const motion: Record<MotionPreset, string> = {
  press: "motion-press",
  pressRound: "motion-press motion-press-round",
  tint: "motion-tint",
  popover: "motion-popover",
  layer: "motion-layer",
  scrim: "motion-scrim",
  enter: "motion-enter",
  control: "motion-control",
  pane: "motion-pane",
  pulse: "motion-pulse",
}

export type MotionTiming = {
  duration: number
  easing: string
}

export type ScriptedPreset = "popover" | "layer" | "enter"
export type MotionPhase = "in" | "out"
export type MotionTrack = "transform" | "opacity"

const instant: MotionTiming = { duration: 0, easing: "linear" }
const timingPattern = /^(\d*\.?\d+)(ms|s)\s+(.+)$/s

export function readTiming(
  name: string,
  root: Element = document.documentElement
): MotionTiming {
  const value = getComputedStyle(root).getPropertyValue(name).trim()
  const match = timingPattern.exec(value)
  if (match?.[1] === undefined || match[3] === undefined) {
    return instant
  }
  const amount = Number(match[1])
  return {
    duration: match[2] === "s" ? amount * 1000 : amount,
    easing: match[3].trim(),
  }
}

export function readMotion(
  preset: ScriptedPreset,
  phase: MotionPhase,
  track: MotionTrack,
  root?: Element
): MotionTiming {
  return readTiming(`--${preset}-${phase}-${track}`, root)
}

export function readDuration(
  name: string,
  root: Element = document.documentElement
): number | undefined {
  const value = getComputedStyle(root).getPropertyValue(name).trim()
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value)
  if (match?.[1] === undefined) {
    return undefined
  }
  const amount = Number(match[1])
  return match[2] === "s" ? amount * 1000 : amount
}

export function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  )
}
