import { interaction } from "@rosesfield/ui/components/interaction"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import type { PresetTileForm } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { SparkleIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type PresetTileProps = {
  name: string
  href: string
  viewLabel: string
  action?: { label: string; href: string }
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
      className="group/reveal relative w-full overflow-hidden rounded-cell bg-(--well)"
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
        aria-label={viewLabel}
        className={cn("absolute inset-0 z-10 rounded-cell", interaction.ring)}
      />
      <span
        aria-hidden="true"
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
        {...(line === undefined ? {} : { line })}
        {...(action === undefined ? {} : { action })}
      />
    </div>
  )
}

function PresetReveal({
  name,
  line,
  action,
}: Pick<PresetTileProps, "name" | "line" | "action">): ReactElement {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 z-20 hidden flex-col items-center justify-center gap-3 bg-scrim p-3 text-center @regular:flex",
        interaction.reveal
      )}
    >
      <span
        data-slot="preset-tile-name"
        className="font-medium text-title text-ink"
      >
        {name}
      </span>
      {line === undefined ? null : (
        <span data-slot="preset-tile-line" className="text-body text-ink-muted">
          {line}
        </span>
      )}
      {action === undefined ? null : (
        <PresetAction label={action.label} href={action.href} />
      )}
    </span>
  )
}

function PresetAction({
  label,
  href,
}: {
  label: string
  href: string
}): ReactElement {
  return (
    <a
      data-slot="preset-tile-action"
      href={href}
      className={cn(
        "material-thin pointer-events-auto relative inline-flex h-10 items-center gap-2 rounded-cell px-3 py-2 font-medium text-body text-ink no-underline",
        interaction.light,
        interaction.ring
      )}
    >
      <SparkleIcon aria-hidden="true" className="size-5" />
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
      <div className="columns-2 gap-2 *:mb-2 *:break-inside-avoid @regular:columns-5">
        {children}
      </div>
    </section>
  )
}

export type { PresetTileProps }
export { PresetGrid, PresetTile }
