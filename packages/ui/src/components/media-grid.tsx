import { cn } from "@rosesfield/ui/lib/cn"
import type { ComponentProps, ReactElement } from "react"

function MediaGrid({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="media-grid"
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-tile),1fr))] gap-s2 *:aspect-square",
        className
      )}
      {...props}
    />
  )
}

export { MediaGrid }
