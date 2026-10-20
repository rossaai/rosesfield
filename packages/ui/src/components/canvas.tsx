import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type CanvasProps = {
  label: string
  tabs: ReactNode
  cluster?: ReactNode
  hasRuns: boolean
  children: ReactNode
  className?: string
}

function Canvas({
  label,
  tabs,
  cluster,
  hasRuns,
  children,
  className,
}: CanvasProps): ReactElement {
  return (
    <section
      aria-label={label}
      data-slot="state-view"
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-card bg-canvas",
        className
      )}
    >
      <header
        data-slot="canvas-head"
        className="flex min-h-14 shrink-0 items-start px-4 pt-2 pb-3"
      >
        <div className="flex min-h-9 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {tabs}
          <div
            data-slot="canvas-cluster"
            aria-hidden={hasRuns ? undefined : true}
            className={cn(
              "flex h-9 items-center gap-2 @max-regular:w-full @max-regular:justify-end",
              hasRuns ? "" : "invisible @max-regular:hidden"
            )}
          >
            {cluster}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  )
}

type StepCard = {
  id: string
  title: string
  line: string
  media: ReactNode
  action?: ReactNode
}

function StepCards({
  title,
  line,
  steps,
}: {
  title: string
  line: string
  steps: ReadonlyArray<StepCard>
}): ReactElement {
  return (
    <div
      data-slot="state-view-lead"
      className="flex flex-col px-12 py-24 text-start @regular:px-8"
    >
      <h2 data-slot="state-view-title" className="text-display text-ink">
        {title}
      </h2>
      <p
        data-slot="state-view-description"
        className="mt-2 text-body text-ink-muted"
      >
        {line}
      </p>
      <ol className="mt-8 grid grid-cols-3 gap-10 wrap-normal">
        {steps.map((step) => (
          <li key={step.id} className="flex min-w-0 flex-col">
            <div className="relative aspect-[25/19] w-full overflow-hidden rounded-card bg-(--well)">
              <div className="size-full *:size-full *:object-cover">
                {step.media}
              </div>
              {step.action === undefined ? null : (
                <span className="absolute right-2 bottom-2">{step.action}</span>
              )}
            </div>
            <h3 className="mt-4 font-medium text-title text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-body text-ink-muted">{step.line}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export type { CanvasProps, StepCard }
export { Canvas, StepCards }
