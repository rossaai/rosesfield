import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ArrowUpRightIcon, ChevronRightIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

const rowClass =
  "relative flex min-h-11 w-full items-center gap-s3 rounded-item px-s4 py-s2 text-start text-body"

const hairlines =
  "*:not-first:before:pointer-events-none *:not-first:before:absolute *:not-first:before:-top-px *:not-first:before:right-s4 *:not-first:before:left-[calc(var(--spacing-s4)+var(--spacing-glyph)+var(--spacing-s3))] *:not-first:before:h-px *:not-first:before:bg-(--line)"

const pressClass = cn(
  "cursor-pointer outline-hor-text hover:bg-(--tint) focus-visible:outline-(length:--spacing-focus-ring) focus-visible:outline-solid focus-visible:-outline-offset-(--spacing-focus-ring)",
  motion.tint,
  interaction.ring
)

const trailGlyph = "glyph shrink-0 text-ink-muted"

type RowParts = {
  icon: ReactElement
  label: ReactNode
  value?: ReactNode
  control?: ReactNode
  tone?: "danger"
}

export function SettingsRowBody({
  icon,
  label,
  value,
  control,
  tone,
  trail,
}: RowParts & { trail?: ReactNode }): ReactElement {
  return (
    <>
      <span
        aria-hidden="true"
        data-slot="settings-row-lead"
        className={cn(
          "flex size-glyph shrink-0 items-center justify-center [&_svg]:glyph",
          tone === "danger" ? "text-bug-text" : "text-ink-muted"
        )}
      >
        {icon}
      </span>
      <span
        data-slot="settings-row-label"
        className={cn(
          "min-w-16 flex-1",
          tone === "danger" ? "text-bug-text" : "text-ink"
        )}
      >
        {label}
      </span>
      {value === undefined ? null : (
        <span
          data-slot="settings-row-value"
          className="min-w-16 shrink truncate text-end text-ink-muted"
        >
          {value}
        </span>
      )}
      {control === undefined ? null : (
        <span data-slot="settings-row-control" className="flex shrink-0">
          {control}
        </span>
      )}
      {trail}
    </>
  )
}

export function SettingsRow(props: RowParts): ReactElement {
  return (
    <div data-slot="settings-row" className={rowClass}>
      <SettingsRowBody {...props} />
    </div>
  )
}

export function SettingsButtonRow(
  props: RowParts & { onPress: () => void; busy?: boolean }
): ReactElement {
  return (
    <button
      type="button"
      data-slot="settings-row"
      disabled={props.busy === true}
      aria-busy={props.busy === true ? true : undefined}
      onClick={props.onPress}
      className={cn(rowClass, pressClass, "disabled:cursor-default")}
    >
      <SettingsRowBody {...props} />
    </button>
  )
}

export function SettingsLinkRow(
  props: RowParts & { href: string }
): ReactElement {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noreferrer"
      data-slot="settings-row"
      className={cn(rowClass, pressClass)}
    >
      <SettingsRowBody
        {...props}
        trail={<ArrowUpRightIcon aria-hidden="true" className={trailGlyph} />}
      />
    </a>
  )
}

export const settingsNavRowClass = cn(rowClass, pressClass)

export function SettingsNavBody(props: RowParts): ReactElement {
  return (
    <SettingsRowBody
      {...props}
      trail={<ChevronRightIcon aria-hidden="true" className={trailGlyph} />}
    />
  )
}

export function SettingsGroup({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}): ReactElement {
  return (
    <section
      data-slot="settings-group"
      aria-label={label}
      className="flex flex-col gap-s2"
    >
      {label === undefined ? null : (
        <h3 className="ps-[calc(var(--spacing-s1)+var(--spacing-s4)+var(--spacing-glyph)+var(--spacing-s3))] text-label font-medium text-ink-muted">
          {label}
        </h3>
      )}
      <div
        data-ground="surface"
        className={cn("flex flex-col rounded-card bg-surface p-s1", hairlines)}
      >
        {children}
      </div>
    </section>
  )
}

export function SettingsRowSkeleton(): ReactElement {
  return (
    <div data-slot="settings-row" className={rowClass}>
      <Skeleton className="size-glyph shrink-0 rounded-full" />
      <Skeleton className="h-s3 w-1/3" />
    </div>
  )
}
