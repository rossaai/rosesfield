import { clipPlanLimits } from "#motion/clip-plan"

export const graphModel = "ltx-2-3-control"

export const ltx25GuideModel = "ltx-2-5-guide"

export const swapModel = "ltx-2-3-swap"

export const readClipModel = "motion-read-clip"

export const planModel = "motion-plan"

export const motionAppId = "motion"

export const motionTasks: readonly string[] = [
  "motion-transfer",
  "character-swap",
]

/** The stretch of your video each Motion graph keeps, in seconds from its start: the duration of the graph's Slice node, which starts at 0. A longer video is trimmed to it. */
export const graphClipSeconds: Readonly<Record<string, number>> = {
  [ltx25GuideModel]: clipPlanLimits.longestSeconds,
  [graphModel]: clipPlanLimits.longestSeconds,
  [swapModel]: 5,
}

/** The seconds a Motion graph takes of your video, from the shortest to the stretch it keeps, or null for a model that is not a Motion graph. */
export function graphClipRangeOf(
  model: string
): { min: number; max: number } | null {
  const max = graphClipSeconds[model]
  return max === undefined ? null : { min: clipPlanLimits.shortestSeconds, max }
}
