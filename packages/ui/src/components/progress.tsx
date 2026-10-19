import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"

type ProgressProps = Omit<ProgressPrimitive.Root.Props, "value" | "max"> & {
  value: number
}

function Progress({
  className,
  value,
  children,
  ...props
}: ProgressProps): ReactElement {
  const fraction = Math.min(1, Math.max(0, value / 100))
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("flex w-full flex-col gap-s1_5", className)}
      {...props}
    >
      {children}
      <ProgressPrimitive.Track className="h-track w-full overflow-hidden rounded-full bg-track">
        <span
          data-slot="progress-fill"
          className={cn("block h-full origin-left bg-ink", motion.control)}
          style={{ transform: `scaleX(${fraction})` }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

function ProgressLabel({
  className,
  ...props
}: ProgressPrimitive.Label.Props): ReactElement {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn("text-label text-ink-muted", className)}
      {...props}
    />
  )
}

export { Progress, ProgressLabel }
