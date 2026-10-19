import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type OutputRowProps = {
  aspects: readonly MediaAspect[]
  children: (index: number) => ReactNode
  className?: string
}

const fitHeight =
  "var(--canvas-height, calc(100dvh - 4 * var(--spacing-header))) - max(var(--spacing-icon), var(--text-body--line-height) + var(--text-caption--line-height)) - var(--spacing-s2)"

export function OutputRow({
  aspects,
  children,
  className,
}: OutputRowProps): ReactElement {
  const total = aspects.reduce(
    (sum, aspect) => sum + aspect.width / aspect.height,
    0
  )
  return (
    <div
      data-slot="output-row"
      className={cn(
        "grid w-full grid-cols-2 gap-s2 @regular:flex @regular:items-start",
        className
      )}
      style={{
        maxWidth: `calc((${fitHeight}) * ${total})`,
      }}
    >
      {aspects.map((aspect, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: an output's place in its run is its identity
          key={index}
          className="min-w-0"
          style={{ flex: `${aspect.width / aspect.height} 1 0%` }}
        >
          {children(index)}
        </div>
      ))}
    </div>
  )
}
