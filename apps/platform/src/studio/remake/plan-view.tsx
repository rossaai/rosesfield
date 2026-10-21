import type { Run } from "@rosesfield/contract"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"
import { tCatalog } from "@/copy/t"
import type { RemakePlan } from "@/studio/remake/remake-plan"
import { ShotTimeline } from "@/studio/remake/shot-timeline"
import {
  planPriceOf,
  routeName,
  shotLengthOf,
  shotName,
} from "@/studio/remake/shot-words"

export function PlanView({
  run,
  plan,
}: {
  run: Run
  plan: RemakePlan
}): ReactElement {
  return (
    <section
      data-slot="remake-plan"
      className={cn("flex flex-col gap-s2", motion.enter)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-s2">
        <h3 className="text-body font-medium text-ink">
          {tCatalog("remake.plan.title")}
        </h3>
        <p className="text-caption text-ink-muted">{planPriceOf(run, plan)}</p>
      </div>
      <ShotTimeline shots={plan.shots} />
      <ol className="flex flex-col gap-s1_5">
        {plan.shots.map((shot) => (
          <li
            key={shot.number}
            data-slot="plan-shot"
            className="flex flex-wrap gap-x-s2 text-caption text-ink-muted"
          >
            <span className="text-ink">{shotName(shot)}</span>
            <span>{shotLengthOf(shot)}</span>
            <span>{routeName(shot)}</span>
            {shot.model === null ? null : <span>{shot.model}</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}
