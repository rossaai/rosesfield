import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"

type WorkingPulseProps = {
  label: string
  aspect?: MediaAspect
  children?: ReactNode
  className?: string
}

function WorkingPulse({
  label,
  aspect,
  children,
  className,
}: WorkingPulseProps): ReactElement {
  return (
    <div
      data-slot="working-pulse"
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn(
        "relative flex w-full items-end overflow-hidden rounded-cell p-s2",
        className
      )}
      style={
        aspect === undefined
          ? undefined
          : { aspectRatio: `${aspect.width} / ${aspect.height}` }
      }
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 bg-(--well)", motion.pulse)}
      />
      {children === undefined ? null : (
        <div className="relative w-full">{children}</div>
      )}
    </div>
  )
}

export type { WorkingPulseProps }
export { WorkingPulse }
