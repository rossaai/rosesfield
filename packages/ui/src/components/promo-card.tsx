import { IconButton } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import type { MediaFeedLayout } from "@rosesfield/ui/contracts/media-feed.generated"
import type { PresetTileForm } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion, prefersReducedMotion } from "@rosesfield/ui/motion"
import { ChevronRightIcon } from "lucide-react"
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"

const form: PresetTileForm = "clip"
const layout: MediaFeedLayout = "row"

const cardWidth =
  "w-78 @regular:w-[clamp(calc(var(--spacing)*100),calc((100cqw_-_var(--spacing)*320)*1000),calc(var(--spacing)*128))]"

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
      className={cn(
        "group/promo relative flex shrink-0 snap-start flex-col",
        cardWidth
      )}
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
          className={cn(
            "truncate font-medium text-body text-ink group-hover/promo:text-hor-text in-data-[gallery=hover]:text-hor-text",
            motion.tint
          )}
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

function PromoSkeleton(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn("flex shrink-0 snap-start flex-col gap-3", cardWidth)}
    >
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-12 w-2/3" />
    </div>
  )
}

function isAtEnd(scroller: HTMLElement): boolean {
  return scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1
}

function useAtEnd(scroller: RefObject<HTMLElement | null>): {
  atEnd: boolean
  read: () => void
} {
  const [atEnd, setAtEnd] = useState(false)
  const read = (): void => {
    if (scroller.current !== null) {
      setAtEnd(isAtEnd(scroller.current))
    }
  }
  useEffect(() => {
    if (scroller.current !== null) {
      setAtEnd(isAtEnd(scroller.current))
    }
  })
  return { atEnd, read }
}

function scrollOneCard(scroller: HTMLElement | null): void {
  const [first, second] = scroller?.children ?? []
  if (!(first instanceof HTMLElement && second instanceof HTMLElement)) {
    return
  }
  scroller?.scrollBy({
    left: second.offsetLeft - first.offsetLeft,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  })
}

function PromoRow({
  label,
  nextLabel,
  children,
  className,
}: {
  label: string
  nextLabel: string
  children: ReactNode
  className?: string
}): ReactElement {
  const scroller = useRef<HTMLDivElement>(null)
  const { atEnd, read } = useAtEnd(scroller)
  return (
    <section
      aria-label={label}
      data-slot="media-feed"
      data-layout={layout}
      className={cn("group/promo-row @container relative", className)}
    >
      <div
        ref={scroller}
        data-slot="media-feed-items"
        onScroll={read}
        className={cn(
          "flex snap-x scroll-px-4 gap-5 overflow-x-auto px-4 [scrollbar-width:none]",
          interaction.ringRoomBlock
        )}
      >
        {children}
      </div>
      {atEnd ? null : (
        <span
          data-slot="media-feed-next"
          className={cn(
            "absolute top-31 right-1 z-20 hidden opacity-0 group-focus-within/promo-row:opacity-100 group-hover/promo-row:opacity-100 in-data-[gallery=hover]:opacity-100 @regular:flex",
            motion.tint
          )}
        >
          <IconButton
            label={nextLabel}
            tone="glass"
            onClick={() => scrollOneCard(scroller.current)}
          >
            <ChevronRightIcon aria-hidden="true" />
          </IconButton>
        </span>
      )}
    </section>
  )
}

export type { PromoCardProps }
export { PromoCard, PromoRow, PromoSkeleton }
