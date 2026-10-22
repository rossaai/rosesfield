import { ArrivalIndex } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  Children,
  type ComponentProps,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"

type MediaGridProps = ComponentProps<"div"> & {
  layout?: "square" | "masonry"
}

const layouts: Record<NonNullable<MediaGridProps["layout"]>, string> = {
  square:
    "grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-tile),1fr))] gap-s2 *:aspect-square",
  masonry: "columns-2 gap-s2 @regular:columns-4 *:mb-s2 *:break-inside-avoid",
}

function keyOf(child: ReactNode, index: number): string {
  return isValidElement(child) && child.key !== null
    ? child.key
    : `place-${index}`
}

function indexed(children: ReactNode): ReactNode[] {
  return Children.toArray(children).map((child, index) => (
    <ArrivalIndex key={keyOf(child, index)} value={index}>
      {child}
    </ArrivalIndex>
  ))
}

function MediaGrid({
  className,
  layout = "square",
  children,
  ...props
}: MediaGridProps): ReactElement {
  return (
    <div
      data-slot="media-grid"
      data-layout={layout}
      className={cn(layouts[layout], className)}
      {...props}
    >
      {indexed(children)}
    </div>
  )
}

export type { MediaGridProps }
export { indexed, MediaGrid }
