import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type StateViewProps = {
  kind: "empty" | "failed"
  title: string
  body?: ReactNode
  actions?: ReactNode
  mark?: ReactNode
  density?: "full" | "compact"
  className?: string
}

function StateView({
  kind,
  title,
  body,
  actions,
  mark,
  density = "full",
  className,
}: StateViewProps): ReactElement {
  const isFull = density === "full"
  return (
    <section
      data-slot="state-view"
      data-kind={kind}
      role={kind === "failed" ? "alert" : undefined}
      className={cn(
        "flex flex-col gap-s2",
        isFull
          ? "mx-auto min-h-full w-full max-w-prose-max items-center justify-center px-s6 py-s12 text-center"
          : "items-start p-s3 text-left",
        className
      )}
    >
      {mark === undefined ? null : (
        <div className={cn("text-ink", isFull ? "pb-s3" : "")}>{mark}</div>
      )}
      <h2 className={isFull ? "text-title" : "text-body font-medium"}>
        {title}
      </h2>
      {body === undefined ? null : (
        <p className="line-clamp-2 text-body text-ink-muted">{body}</p>
      )}
      {actions === undefined ? null : (
        <div className="flex flex-wrap items-center gap-s2 pt-s2">
          {actions}
        </div>
      )}
    </section>
  )
}

export type { StateViewProps }
export { StateView }
