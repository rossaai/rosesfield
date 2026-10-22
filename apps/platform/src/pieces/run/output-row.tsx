import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  type CSSProperties,
  createContext,
  type ReactElement,
  type ReactNode,
  use,
} from "react"

type OutputRowProps = {
  aspects: readonly MediaAspect[]
  children: (index: number) => ReactNode
  overlay?: ReactNode
  className?: string
}

const fitHeight =
  "var(--canvas-height, calc(100dvh - 4 * var(--spacing-header)))"

type RowStyle = CSSProperties & { "--row-max"?: string }

const FillsColumn = createContext(false)

export function FillColumn({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return <FillsColumn value={true}>{children}</FillsColumn>
}

function rowStyleOf(cap: string, fillsColumn: boolean): RowStyle {
  return fillsColumn ? { "--row-max": cap } : { maxWidth: cap }
}

export function OutputRow({
  aspects,
  children,
  overlay,
  className,
}: OutputRowProps): ReactElement {
  const total = aspects.reduce(
    (sum, aspect) => sum + aspect.width / aspect.height,
    0
  )
  const fillsColumn = use(FillsColumn)
  return (
    <div
      data-slot="output-row"
      className={cn(
        "relative grid w-full gap-s2 @regular:flex @regular:items-start",
        aspects.length > 1 ? "grid-cols-2" : "grid-cols-1",
        fillsColumn ? "max-w-(--row-max) @regular:max-w-none" : "",
        className
      )}
      style={rowStyleOf(`calc((${fitHeight}) * ${total})`, fillsColumn)}
    >
      {aspects.map((aspect, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: an output's place in its run is its identity
          key={index}
          data-slot="output-cell"
          className="min-w-0"
          style={{ flex: `${aspect.width / aspect.height / total} 1 0%` }}
        >
          {children(index)}
        </div>
      ))}
      {overlay}
    </div>
  )
}
