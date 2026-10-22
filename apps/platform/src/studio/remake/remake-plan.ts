import type { Run } from "@rosesfield/contract"

export type RemakePlan = NonNullable<Run["plan"]>

export type PlanShot = RemakePlan["shots"][number]

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
