import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"
import { useScrolledPast } from "@/shell/screen-header"

const raisedClass =
  "before:pointer-events-none before:absolute before:inset-0 before:-scale-y-100 before:shadow-seam"

export type ContentEnd = {
  endRef: (node: HTMLElement | null) => void
  isContentBelow: boolean
}

export function useContentEnd(): ContentEnd {
  const [endRef, isContentBelow] = useScrolledPast()
  return { endRef, isContentBelow }
}

export function ContentEndMark({ end }: { end: ContentEnd }): ReactElement {
  return <span ref={end.endRef} aria-hidden="true" className="block h-0" />
}

type DockProps = {
  isRaised: boolean
  className?: string
  children: ReactNode
}

export function Dock({
  isRaised,
  className,
  children,
}: DockProps): ReactElement {
  return (
    <div
      data-ground="canvas"
      className={cn(
        "relative bg-canvas",
        isRaised ? raisedClass : "",
        className
      )}
    >
      {children}
    </div>
  )
}
