import { HuggingFaceMark } from "@rosesfield/ui/components/hugging-face-mark"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type BadgeKind = "new" | "top" | "premium" | "openWeights"

const badgeKinds: readonly BadgeKind[] = [
  "new",
  "top",
  "premium",
  "openWeights",
]

const badgeClass =
  "relative ms-1 inline-flex h-4 shrink-0 items-center gap-0.5 rounded-dense bg-(--tint) px-1.5 py-0.5 font-medium text-legal whitespace-nowrap text-ink [&_svg]:size-3"

type BadgeProps = {
  kind: BadgeKind
  children: string
  mark?: ReactNode
  href?: string
  className?: string
}

function linkNameOf(href: string): string {
  const url = new URL(href)
  return `${url.host}${url.pathname}`.replace(/\/$/, "")
}

function Badge({
  kind,
  children,
  mark,
  href,
  className,
}: BadgeProps): ReactElement {
  const shownMark =
    mark ?? (kind === "openWeights" ? <HuggingFaceMark /> : undefined)
  const isLink = kind === "openWeights" && href !== undefined
  return (
    <span
      data-slot="badge"
      data-kind={kind}
      className={cn(badgeClass, className)}
    >
      {shownMark === undefined ? null : isLink ? (
        <a
          data-slot="badge-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={linkNameOf(href)}
          className={cn(
            "pointer-events-auto relative z-10 flex rounded-dense",
            interaction.light,
            interaction.ring
          )}
        >
          {shownMark}
        </a>
      ) : (
        <span aria-hidden="true" className="flex">
          {shownMark}
        </span>
      )}
      <span data-slot="count-badge-words">{children}</span>
    </span>
  )
}

export type { BadgeKind, BadgeProps }
export { Badge, badgeKinds }
