import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type PromoCardProps = {
  title: string
  line: string
  href: string
  openLabel: string
  media: ReactNode
}

function PromoCard({
  title,
  line,
  href,
  openLabel,
  media,
}: PromoCardProps): ReactElement {
  return (
    <article
      data-slot="promo-card"
      className="group/promo relative flex w-78 shrink-0 snap-start flex-col @regular:w-128"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-cell bg-(--well) *:size-full *:object-cover">
        {media}
      </div>
      <div className="mt-3 flex h-12 min-w-0 flex-col">
        <h3 className="truncate font-medium text-body text-ink transition-colors duration-(--duration-control) group-hover/promo:text-hor-text in-data-[gallery=hover]:text-hor-text">
          {title}
        </h3>
        <p className="truncate text-body text-ink-muted">{line}</p>
      </div>
      <a
        href={href}
        aria-label={openLabel}
        className="absolute inset-0 z-10 rounded-cell"
      />
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
      data-slot="promo-row"
      className={cn("@container w-full", className)}
    >
      <div className="flex snap-x gap-5 overflow-x-auto px-4 [scrollbar-width:none]">
        {children}
      </div>
    </section>
  )
}

export type { PromoCardProps }
export { PromoCard, PromoRow }
