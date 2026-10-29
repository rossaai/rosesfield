import { HuggingFaceMark } from "@rosesfield/ui/components/hugging-face-mark"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { CSSProperties, ReactElement, ReactNode } from "react"

type BadgeKind = "new" | "value" | "openWeights" | "featured"

type BadgeTone = "nop" | "hor" | "cem" | "bug" | "quiet" | "glass"

const badgeKinds: readonly BadgeKind[] = [
  "new",
  "value",
  "openWeights",
  "featured",
]

const badgeTones: readonly BadgeTone[] = [
  "nop",
  "hor",
  "cem",
  "bug",
  "quiet",
  "glass",
]

const tones = {
  nop: "bg-nop-tint text-nop-text",
  hor: "bg-hor-tint text-hor-text",
  cem: "bg-cem-tint text-cem-text",
  bug: "bg-bug-tint text-bug-text",
  quiet: "bg-(--tint) text-ink",
  glass: "material-thin text-ink",
} satisfies Record<BadgeTone, string>

const kindTones = {
  new: "nop",
  value: "cem",
  openWeights: "cem",
  featured: "bug",
} as const satisfies Record<BadgeKind, BadgeTone>

const badgeClass =
  "relative ms-1 inline-flex h-4 shrink-0 items-center gap-0.5 rounded-dense px-1.5 py-0.5 font-medium text-legal whitespace-nowrap [&_svg]:size-3"

type BadgeProps = {
  kind?: BadgeKind
  tone?: BadgeTone
  children: string
  mark?: ReactNode
  markColour?: string
  href?: string
  className?: string
}

function linkNameOf(href: string): string {
  const url = new URL(href)
  return `${url.host}${url.pathname}`.replace(/\/$/, "")
}

function toneOf(
  kind: BadgeKind | undefined,
  tone: BadgeTone | undefined
): BadgeTone {
  return tone ?? (kind === undefined ? "quiet" : kindTones[kind])
}

function BadgeMark({
  mark,
  colour,
}: {
  mark: ReactNode
  colour: string | undefined
}): ReactElement {
  const style: CSSProperties | undefined =
    colour === undefined ? undefined : { color: colour }
  return (
    <span
      aria-hidden="true"
      data-slot="badge-mark"
      className="flex"
      style={style}
    >
      {mark}
    </span>
  )
}

const pressable = "pointer-events-auto z-10"

function BadgeLink({
  href,
  tone,
  className,
  children,
}: {
  href: string
  tone: BadgeTone
  className: string
  children: ReactNode
}): ReactElement {
  return (
    <a
      data-slot="badge"
      data-kind="openWeights"
      data-tone={tone}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-description={linkNameOf(href)}
      className={cn(className, pressable, motion.press, interaction.ring)}
    >
      {children}
    </a>
  )
}

function Badge({
  kind,
  tone,
  children,
  mark,
  markColour,
  href,
  className,
}: BadgeProps): ReactElement {
  const shownMark =
    mark ?? (kind === "openWeights" ? <HuggingFaceMark /> : undefined)
  const shownTone = toneOf(kind, tone)
  const look = cn(badgeClass, tones[shownTone], className)
  const content = (
    <>
      {shownMark === undefined ? null : (
        <BadgeMark mark={shownMark} colour={markColour} />
      )}
      <span data-slot="count-badge-words">{children}</span>
    </>
  )
  if (kind === "openWeights" && href !== undefined) {
    return (
      <BadgeLink href={href} tone={shownTone} className={look}>
        {content}
      </BadgeLink>
    )
  }
  return (
    <span
      data-slot="badge"
      data-kind={kind}
      data-tone={shownTone}
      className={look}
    >
      {content}
    </span>
  )
}

export type { BadgeKind, BadgeProps, BadgeTone }
export { Badge, badgeKinds, badgeTones }
