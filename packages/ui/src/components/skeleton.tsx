import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ComponentProps, ReactElement } from "react"

function Skeleton({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-cell bg-(--well)", motion.pulse, className)}
      {...props}
    />
  )
}

export { Skeleton }
