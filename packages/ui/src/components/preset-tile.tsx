import { buttonVariants } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { FeedStacks } from "@rosesfield/ui/components/media-feed"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import type { PresetTileForm } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { SparkleIcon } from "lucide-react"
import type { MouseEvent, ReactElement, ReactNode } from "react"

type PresetTileAction = {
  label: string
  href: string
  onSelect?: () => void
}

type PresetTileProps = {
  name: string
  href: string
  viewLabel: string
  action?: PresetTileAction
  clip: { src: string; poster?: string; alt: string }
  aspect: MediaAspect
  form?: PresetTileForm
  line?: string
}

function PresetTile({
  name,
  href,
  viewLabel,
  action,
  clip,
  aspect,
  form = "clip",
  line,
}: PresetTileProps): ReactElement {
  return (
    <div
      data-slot="preset-tile"
      data-form={form}
      className={cn(
        "group/reveal relative w-full overflow-hidden rounded-cell bg-(--well)",
        motion.press,
        interaction.ringHost
      )}
      style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
    >
      <span data-slot="preset-tile-clip" className="absolute inset-0">
        <MediaTile
          kind="video"
          src={clip.src}
          alt={clip.alt}
          {...(clip.poster === undefined ? {} : { poster: clip.poster })}
          className="rounded-none"
        />
      </span>
      <a
        href={href}
        data-cover=""
        className={cn("absolute inset-0 z-10 rounded-cell", interaction.cover)}
      >
        <span className="sr-only">{viewLabel}</span>
      </a>
      <span
        aria-hidden="true"
        data-theme="dark"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-1/2 items-end bg-linear-to-t from-scrim to-transparent p-3 @regular:hidden"
      >
        <span
          data-slot="preset-tile-name"
          className="truncate font-medium text-body text-ink"
        >
          {name}
        </span>
      </span>
      <PresetReveal
        name={name}
        isTall={aspect.height > aspect.width}
        {...(line === undefined ? {} : { line })}
        {...(action === undefined ? {} : { action })}
      />
    </div>
  )
}

function PresetReveal({
  name,
  isTall,
  line,
  action,
}: Pick<PresetTileProps, "name" | "line" | "action"> & {
  isTall: boolean
}): ReactElement {
  return (
    <span
      data-theme="dark"
      className={cn(
        "pointer-events-none absolute inset-0 z-20 hidden flex-col items-center justify-center gap-3 bg-scrim p-3 text-center @regular:flex",
        interaction.reveal
      )}
    >
      <span
        data-slot="preset-tile-name"
        className={cn(
          "font-medium text-ink",
          isTall ? "text-display" : "text-title"
        )}
      >
        {name}
      </span>
      {line === undefined ? null : (
        <span data-slot="preset-tile-line" className="text-body text-ink">
          {line}
        </span>
      )}
      {action === undefined ? null : <PresetAction action={action} />}
    </span>
  )
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

function PresetAction({ action }: { action: PresetTileAction }): ReactElement {
  const { label, href, onSelect } = action
  return (
    <a
      data-slot="preset-tile-action"
      href={href}
      onClick={(event) => {
        if (onSelect !== undefined && isPlainClick(event)) {
          event.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        buttonVariants({ tone: "glass" }),
        "pointer-events-auto no-underline"
      )}
    >
      <SparkleIcon aria-hidden="true" />
      {label}
    </a>
  )
}

function PresetGrid({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <section
      aria-label={label}
      data-slot="preset-grid"
      className="@container w-full"
    >
      <FeedStacks form="presets">{children}</FeedStacks>
    </section>
  )
}

export type { PresetTileAction, PresetTileProps }
export { PresetGrid, PresetTile }
