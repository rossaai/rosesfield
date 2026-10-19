import { cn } from "@rosesfield/ui/lib/cn"
import type { ComponentProps, ReactElement } from "react"

type MediaGridProps = ComponentProps<"div"> & {
  layout?: "square" | "masonry"
}

const layouts: Record<NonNullable<MediaGridProps["layout"]>, string> = {
  square:
    "grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-tile),1fr))] gap-s2 *:aspect-square",
  masonry: "columns-2 gap-s2 @regular:columns-4 *:mb-s2 *:break-inside-avoid",
}

function MediaGrid({
  className,
  layout = "square",
  ...props
}: MediaGridProps): ReactElement {
  return (
    <div
      data-slot="media-grid"
      data-layout={layout}
      className={cn(layouts[layout], className)}
      {...props}
    />
  )
}

export type { MediaGridProps }
export { MediaGrid }
