import { z } from "zod"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"

export type PlannedTarget = {
  find: string
  becomes: string
  photos: number[]
}

export type ClipPlan = {
  targets: PlannedTarget[]
  editPrompt: string
  scene: string
  unusedPhotos: number[]
}

export const clipPlanLimits = {
  frames: 4,
  mostPhotos: 15,
  mostTargets: 3,
  longestFind: 80,
  longestBecomes: 300,
  longestEditPrompt: 1500,
  longestScene: 2000,
  longestSentence: 500,
} as const

const findText = z
  .string()
  .trim()
  .min(1)
  .max(clipPlanLimits.longestFind)
  .regex(/^[^,:()]+$/)

const plannedTarget = z.strictObject({
  find: findText,
  becomes: z.string().trim().min(1).max(clipPlanLimits.longestBecomes),
  photos: z
    .array(z.number().int().min(1).max(clipPlanLimits.mostPhotos))
    .max(clipPlanLimits.mostPhotos),
})

export const clipPlanReply = z.strictObject({
  targets: z.array(plannedTarget).max(clipPlanLimits.mostTargets),
  editPrompt: z.string().trim().max(clipPlanLimits.longestEditPrompt),
  scene: z.string().trim().max(clipPlanLimits.longestScene),
})

export type ClipPlanReply = z.infer<typeof clipPlanReply>

const controlTerms =
  /\b(depth|depth map|mask|matte|guide video|control video|controlnet|ic-lora|lora|pose skeleton|attention|segmentation)\b/i

export function isContentOnly(text: string): boolean {
  return !controlTerms.test(text)
}

function targetsOf(reply: ClipPlanReply, photoCount: number): PlannedTarget[] {
  return reply.targets.flatMap((target) => {
    const photos = [...new Set(target.photos)]
      .filter((photo) => photo <= photoCount)
      .map((photo) => photo - 1)
    return photos.length === 0 ? [] : [{ ...target, photos }]
  })
}

/** Reads the planner's reply into a plan, or refuses it before any GPU runs. */
export function planClip(reply: unknown, photoCount: number): ClipPlan {
  const parsed = clipPlanReply.safeParse(reply)
  if (!parsed.success) {
    throw new ClipPlanUnreadableError({ cause: parsed.error })
  }
  const targets = targetsOf(parsed.data, photoCount)
  if (targets.length === 0) {
    throw new ClipPlanNoTargetError()
  }
  const { editPrompt, scene } = parsed.data
  if (editPrompt === "" || scene === "" || !isContentOnly(scene)) {
    throw new ClipPlanUnreadableError({ cause: "an empty or control prompt" })
  }
  const used = new Set(targets.flatMap((target) => target.photos))
  const unusedPhotos = Array.from({ length: photoCount }, (_, at) => at).filter(
    (photo) => !used.has(photo)
  )
  return { targets, editPrompt, scene, unusedPhotos }
}

/** Joins the targets into the one text the tracker splits at each comma. */
export function trackTextOf(plan: ClipPlan): string {
  return plan.targets
    .map((target) => target.find.replace(/[,:()]/g, " ").trim())
    .join(", ")
}
