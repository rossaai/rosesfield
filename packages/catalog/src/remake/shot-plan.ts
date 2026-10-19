import { z } from "zod"
import { type CameraMove, cameraMoves } from "#video/camera-moves"

export type ShotPeople = "none" | "one" | "several"
export type ShotRoute = "replace" | "rebuild" | "keep"
export type OtherShots = "rebuild" | "keep"

export type FoundShot = {
  number: number
  startSeconds: number
  endSeconds: number
}

export type PlannedShot = FoundShot & {
  people: ShotPeople
  route: ShotRoute
  words: string | null
  cameraMove: CameraMove | null
}

export type ShotProblem =
  | { code: "shotCount"; count: number }
  | { code: "shotLength"; number: number; seconds: number }
  | { code: "editLength"; seconds: number }

export const remakeLimits = {
  shortestEditSeconds: 2,
  longestEditSeconds: 12,
  largestEditBytes: 100 * 1024 * 1024,
  fewestShots: 2,
  mostShots: 6,
  shortestShotSeconds: 1,
  longestShotSeconds: 5,
  shortestRebuildSeconds: 2,
  longestWords: 300,
  framesPerSecond: 24,
} as const

const cameraMoveValues = cameraMoves.map((move) => move.value)

function isCameraMove(value: string): value is CameraMove {
  return cameraMoveValues.some((move) => move === value)
}

const planEntry = z.strictObject({
  people: z.enum(["none", "one", "several"]),
  words: z.string().max(remakeLimits.longestWords).nullable(),
  cameraMove: z.string().refine(isCameraMove).nullable(),
})

export const planReply = z.strictObject({ shots: z.array(planEntry) })

export type PlanReply = z.infer<typeof planReply>

export function framesOf(seconds: number): number {
  return Math.round(seconds * remakeLimits.framesPerSecond)
}

export function shotSecondsOf(shot: FoundShot): number {
  return (
    framesOf(shot.endSeconds - shot.startSeconds) / remakeLimits.framesPerSecond
  )
}

export function editSecondsOf(shots: readonly FoundShot[]): number {
  const frames = shots.reduce(
    (total, shot) => total + framesOf(shotSecondsOf(shot)),
    0
  )
  return frames / remakeLimits.framesPerSecond
}

export function editLengthOf(seconds: number): "short" | "long" | null {
  const frames = framesOf(seconds)
  if (frames < framesOf(remakeLimits.shortestEditSeconds)) {
    return "short"
  }
  if (frames > framesOf(remakeLimits.longestEditSeconds)) {
    return "long"
  }
  return null
}

export function checkShots(shots: readonly FoundShot[]): ShotProblem | null {
  if (
    shots.length < remakeLimits.fewestShots ||
    shots.length > remakeLimits.mostShots
  ) {
    return { code: "shotCount", count: shots.length }
  }
  for (const shot of shots) {
    const seconds = shotSecondsOf(shot)
    if (
      seconds < remakeLimits.shortestShotSeconds ||
      seconds > remakeLimits.longestShotSeconds
    ) {
      return { code: "shotLength", number: shot.number, seconds }
    }
  }
  const seconds = editSecondsOf(shots)
  if (editLengthOf(seconds) === "long") {
    return { code: "editLength", seconds }
  }
  return null
}

export function routeOf(people: ShotPeople, otherShots: OtherShots): ShotRoute {
  return people === "one" ? "replace" : otherShots
}

export function planShots(
  shots: readonly FoundShot[],
  reply: unknown,
  otherShots: OtherShots
): PlannedShot[] | null {
  const parsed = planReply.safeParse(reply)
  if (!parsed.success || parsed.data.shots.length !== shots.length) {
    return null
  }
  const isWordless = parsed.data.shots.some(
    (entry) =>
      routeOf(entry.people, otherShots) === "rebuild" &&
      !/\S/.test(entry.words ?? "")
  )
  if (isWordless) {
    return null
  }
  return shots.map((shot, index) => {
    const entry = parsed.data.shots[index] ?? {
      people: "none",
      words: null,
      cameraMove: null,
    }
    const route = routeOf(entry.people, otherShots)
    const isRebuilt = route === "rebuild"
    const cameraMove =
      isRebuilt && entry.cameraMove !== null && isCameraMove(entry.cameraMove)
        ? entry.cameraMove
        : null
    return {
      ...shot,
      people: entry.people,
      route,
      words: isRebuilt ? entry.words : null,
      cameraMove,
    }
  })
}
