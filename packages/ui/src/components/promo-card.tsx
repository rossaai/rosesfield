import type { MediaFeedLayout } from "@rosesfield/ui/contracts/media-feed.generated"
import type { PresetTileForm } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

const form: PresetTileForm = "clip"
const layout: MediaFeedLayout = "row"

type PromoCardProps = {
  name: string
  line: string
  href: string
  openLabel: string
  clip: ReactNode
}

function PromoCard({
  name,
  line,
  href,
  openLabel,
  clip,
}: PromoCardProps): ReactElement {
  return (
    <article
      data-slot="preset-tile"
      data-form={form}
      className="group/promo relative flex w-78 shrink-0 snap-start flex-col @regular:w-128"
    >
      <div
        data-slot="preset-tile-clip"
        className="relative aspect-video w-full overflow-hidden rounded-cell bg-(--well) *:size-full *:object-cover"
      >
        {clip}
      </div>
      <div className="mt-3 flex h-12 min-w-0 flex-col">
        <h3
          data-slot="preset-tile-name"
          className="truncate font-medium text-body text-ink transition-colors duration-(--duration-control) group-hover/promo:text-hor-text in-data-[gallery=hover]:text-hor-text"
        >
          {name}
        </h3>
        <p
          data-slot="preset-tile-line"
          className="truncate text-body text-ink-muted"
        >
          {line}
        </p>
      </div>
      <a href={href} className="absolute inset-0 z-10 rounded-cell">
        <span className="sr-only">{openLabel}</span>
      </a>
    </article>
  )
}

function PromoRow({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}): ReactElement {
  return (
    <section
      aria-label={label}
      data-slot="media-feed"
      data-layout={layout}
      className={cn("@container w-full", className)}
    >
      <div
        data-slot="media-feed-items"
        className="flex snap-x gap-5 overflow-x-auto px-4 [scrollbar-width:none]"
      >
        {children}
      </div>
    </section>
  )
}

export type { PromoCardProps }
export { PromoCard, PromoRow }
