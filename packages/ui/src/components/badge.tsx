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

const kinds = {
  new: "bg-hor-tint text-hor-text",
  top: "bg-nop-tint text-nop-text",
  premium: "bg-cem-tint text-cem-text",
  openWeights: "bg-(--tint) text-ink",
} satisfies Record<BadgeKind, string>

const badgeClass =
  "relative ms-1 inline-flex h-4 shrink-0 items-center gap-0.5 rounded-dense px-1.5 py-0.5 font-medium text-legal whitespace-nowrap [&_svg]:size-3"

type BadgeProps = {
  kind: BadgeKind
  children: string
  mark?: ReactNode
  href?: string
  className?: string
}

function Badge({
  kind,
  children,
  mark,
  href,
  className,
}: BadgeProps): ReactElement {
  const classes = cn(badgeClass, kinds[kind], className)
  const content = (
    <>
      {mark === undefined ? null : (
        <span aria-hidden="true" className="flex">
          {mark}
        </span>
      )}
      <span data-slot="count-badge-words">{children}</span>
    </>
  )
  if (kind === "openWeights" && href !== undefined) {
    return (
      <a
        data-slot="badge"
        data-kind={kind}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(classes, interaction.light, interaction.ring)}
      >
        {content}
      </a>
    )
  }
  return (
    <span data-slot="badge" data-kind={kind} className={classes}>
      {content}
    </span>
  )
}

export type { BadgeKind, BadgeProps }
export { Badge, badgeKinds }
