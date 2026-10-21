import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"
import { tCatalog } from "@/copy/t"
import type { PlanShot } from "@/studio/remake/remake-plan"
import { shotName } from "@/studio/remake/shot-words"

type ShotTimelineProps = {
  shots: readonly PlanShot[]
  onSeek?: (shot: PlanShot) => void
}

const segmentClass =
  "flex min-w-0 flex-1 items-center justify-center text-caption"

export function ShotTimeline({
  shots,
  onSeek,
}: ShotTimelineProps): ReactElement {
  return (
    <ol
      data-slot="shot-timeline"
      aria-label={tCatalog("remake.plan.title")}
      className="flex h-s8 w-full items-stretch overflow-hidden rounded-dense bg-(--well)"
    >
      {shots.map((shot, index) => (
        <li
          key={shot.number}
          data-slot="shot"
          className="flex min-w-0 items-stretch"
          style={{ flex: `${shot.endSeconds - shot.startSeconds} 1 0%` }}
        >
          {index === 0 ? null : (
            <span
              data-slot="cut"
              aria-hidden="true"
              className="w-px shrink-0 bg-ink"
            />
          )}
          {onSeek === undefined ? (
            <span className={cn(segmentClass, "text-ink-muted")}>
              {shot.number}
            </span>
          ) : (
            <button
              type="button"
              aria-label={shotName(shot)}
              onClick={() => onSeek(shot)}
              className={cn(
                segmentClass,
                "text-ink hover:bg-(--tint)",
                motion.tint
              )}
            >
              {shot.number}
            </button>
          )}
        </li>
      ))}
    </ol>
  )
}
