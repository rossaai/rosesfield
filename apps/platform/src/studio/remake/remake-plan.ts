import { fieldOf, oneOf } from "@/api/call-path"
import {
  type PlannedShot,
  remakeLimits,
  type ShotRoute,
} from "../../../../../packages/catalog/src/remake/shot-plan"
import {
  type CameraMove,
  cameraMoves,
} from "../../../../../packages/catalog/src/video/camera-moves"

export type PlanShot = Pick<
  PlannedShot,
  "number" | "startSeconds" | "endSeconds" | "route" | "words" | "cameraMove"
> & {
  model: string | null
  credits: number | null
  seed: number | null
}

export type RemakePlan = {
  shots: readonly PlanShot[]
}

const shotRoutes: readonly ShotRoute[] = ["replace", "rebuild", "keep"]

function secondsOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null
}

function wholeOf(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null
}

function textOf(value: unknown): string | null {
  return typeof value === "string" && /\S/.test(value) ? value : null
}

function cameraMoveOf(value: unknown): CameraMove | null {
  return cameraMoves.find((move) => move.value === value)?.value ?? null
}

function readShot(value: unknown): PlanShot | null {
  const number = wholeOf(fieldOf(value, "number"))
  const startSeconds = secondsOf(fieldOf(value, "startSeconds"))
  const endSeconds = secondsOf(fieldOf(value, "endSeconds"))
  const route = oneOf(fieldOf(value, "route"), shotRoutes)
  if (
    number === null ||
    startSeconds === null ||
    endSeconds === null ||
    route === null ||
    endSeconds <= startSeconds
  ) {
    return null
  }
  return {
    number,
    startSeconds,
    endSeconds,
    route,
    model: textOf(fieldOf(value, "model")),
    credits: secondsOf(fieldOf(value, "credits")),
    seed: wholeOf(fieldOf(value, "seed")),
    words: route === "rebuild" ? textOf(fieldOf(value, "words")) : null,
    cameraMove:
      route === "rebuild" ? cameraMoveOf(fieldOf(value, "cameraMove")) : null,
  }
}

export function readPlan(value: unknown): RemakePlan | null {
  const shots = fieldOf(value, "shots")
  if (
    !Array.isArray(shots) ||
    shots.length === 0 ||
    shots.length > remakeLimits.mostShots
  ) {
    return null
  }
  const read = shots.map(readShot)
  const isWhole = read.every(
    (shot, index): shot is PlanShot =>
      shot !== null &&
      shot.number === index + 1 &&
      (index === 0 || shot.startSeconds >= (read[index - 1]?.endSeconds ?? 0))
  )
  return isWhole ? { shots: read.filter((shot) => shot !== null) } : null
}

export function planCreditsOf(plan: RemakePlan): number | null {
  let total = 0
  for (const shot of plan.shots) {
    if (shot.credits === null) {
      if (shot.route !== "keep") {
        return null
      }
    } else {
      total += shot.credits
    }
  }
  return total
}
