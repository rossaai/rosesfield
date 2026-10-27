import type { Run } from "@rosesfield/contract"
import { formatSeconds, formatWholeCredits } from "@/copy/format"
import { copyLocale, t, tCatalog } from "@/copy/t"
import {
  type PlanShot,
  planCreditsOf,
  type RemakePlan,
} from "@/studio/remake/remake-plan"
import {
  type ShotRoute,
  shotSecondsOf,
} from "../../../../../packages/catalog/src/remake/shot-plan"
import { cameraMoves } from "../../../../../packages/catalog/src/video/camera-moves"

const lengths = new Intl.NumberFormat(copyLocale, {
  style: "unit",
  unit: "second",
  unitDisplay: "long",
  maximumFractionDigits: 1,
})

const routeKeys: Readonly<Record<ShotRoute, string>> = {
  replace: "remake.route.replace",
  rebuild: "remake.route.rebuild",
  keep: "remake.route.keep",
}

export function shotName(shot: Pick<PlanShot, "number">): string {
  return tCatalog("remake.plan.shot", { number: shot.number })
}

export function routeName(shot: Pick<PlanShot, "route">): string {
  return tCatalog(routeKeys[shot.route])
}

export function shotLengthOf(shot: PlanShot): string {
  return lengths.format(shotSecondsOf(shot))
}

export function shotSpanOf(shot: PlanShot): string {
  return t("model.tag.length", {
    min: formatSeconds(shot.startSeconds),
    max: formatSeconds(shot.endSeconds),
  })
}

export function creditsText(credits: number): string {
  return t("run.price.credits", { amount: formatWholeCredits(credits) })
}

export function planPriceOf(run: Run, plan: RemakePlan): string | null {
  if (run.origin === "demo") {
    return t("run.price.demo")
  }
  const credits = planCreditsOf(plan)
  return credits === null ? null : creditsText(credits)
}

export function cameraMoveName(move: string): string | null {
  const row = cameraMoves.find((one) => one.value === move)
  return row === undefined ? null : tCatalog(row.labelKey)
}
