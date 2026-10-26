import { useRender } from "@base-ui/react/use-render"
import { buttonVariants, IconButton } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  FeedStacks,
  feedColumnsOf,
  packStacks,
  SizedStacks,
} from "@rosesfield/ui/components/media-feed-stacks"
import { ArrivalIndex } from "@rosesfield/ui/components/media-tile"
import type { MediaFeedLayout } from "@rosesfield/ui/contracts/media-feed.generated"
import { edgeMaskOf, useScrollEnds } from "@rosesfield/ui/hooks/use-scroll-ends"
import { cn } from "@rosesfield/ui/lib/cn"
import { prefersReducedMotion } from "@rosesfield/ui/motion"
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  Children,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useRef,
} from "react"

type MediaFeedContent = "media" | "presets"

type RowLabels = {
  previous: string
  next: string
}

const rowFade = "var(--spacing-s12)"

const rowThirds = "*:w-[calc((100%-var(--spacing-s2)*3)/3.4)]"

function FeedRow({
  labels,
  cellWidth,
  children,
}: {
  labels: RowLabels | undefined
  cellWidth: number | undefined
  children: ReactNode
}): ReactElement {
  const row = useRef<HTMLDivElement>(null)
  const { ends, update } = useScrollEnds(row)
  const items = Children.toArray(children)
  const move = (direction: 1 | -1): void => {
    const element = row.current
    const first = element?.firstElementChild
    const step = first instanceof HTMLElement ? first.offsetWidth : 0
    element?.scrollBy({
      left: direction * step,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }
  return (
    <div className="relative">
      <div
        ref={row}
        data-slot="media-feed-items"
        data-stacks="row"
        onScroll={update}
        style={edgeMaskOf(ends, rowFade)}
        className={cn(
          "flex snap-x gap-s2 overflow-x-auto [scrollbar-width:none] *:shrink-0 *:snap-start",
          cellWidth === undefined ? rowThirds : "",
          interaction.ringRoomBlock
        )}
      >
        {items.map((item, place) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a tile's place in the row is its identity
            key={place}
            data-slot="media-feed-cell"
            className="min-w-0"
            style={cellWidth === undefined ? undefined : { width: cellWidth }}
          >
            <ArrivalIndex value={place}>{item}</ArrivalIndex>
          </div>
        ))}
      </div>
      {labels === undefined ? null : (
        <>
          <RowStep
            end="start"
            label={labels.previous}
            isShown={ends.start}
            onPress={() => move(-1)}
          />
          <RowStep
            end="end"
            label={labels.next}
            isShown={ends.end}
            onPress={() => move(1)}
          />
        </>
      )}
    </div>
  )
}

function RowStep({
  end,
  label,
  isShown,
  onPress,
}: {
  end: "start" | "end"
  label: string
  isShown: boolean
  onPress: () => void
}): ReactElement {
  return (
    <span
      data-slot={end === "start" ? "media-feed-previous" : "media-feed-next"}
      className={cn(
        "absolute top-1/2 z-20 hidden -translate-y-1/2 @regular:flex",
        end === "start" ? "start-s2" : "end-s2",
        isShown ? "" : "pointer-events-none invisible"
      )}
    >
      <IconButton label={label} tone="glass" onClick={onPress}>
        {end === "start" ? (
          <ChevronLeftIcon aria-hidden="true" />
        ) : (
          <ChevronRightIcon aria-hidden="true" />
        )}
      </IconButton>
    </span>
  )
}

type ViewAllProps = Omit<ComponentProps<"a">, "children"> & {
  children: string
  render?: ReactElement
}

function ViewAll({
  children,
  render,
  className,
  ...props
}: ViewAllProps): ReactElement {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-slot": "media-feed-viewAll",
      className: cn(
        buttonVariants(),
        "pointer-events-auto no-underline hover:z-1 focus-visible:z-1 in-data-[gallery=hover]:z-1",
        className
      ),
      children: (
        <>
          {children}
          <ArrowUpRightIcon aria-hidden="true" />
        </>
      ),
    },
  })
}

type MediaFeedProps = {
  label: string
  layout?: MediaFeedLayout
  header?: ReactNode
  viewAll?: ReactNode
  content?: MediaFeedContent
  rowLabels?: RowLabels
  cellWidth?: number
  isClipped?: boolean
  children: ReactNode
  className?: string
}

function FeedItems({
  layout,
  content,
  rowLabels,
  cellWidth,
  children,
}: Pick<MediaFeedProps, "rowLabels" | "cellWidth" | "children"> & {
  layout: MediaFeedLayout
  content: MediaFeedContent
}): ReactElement {
  if (content === "presets") {
    return <FeedStacks form="presets">{children}</FeedStacks>
  }
  if (layout === "row") {
    return (
      <FeedRow labels={rowLabels} cellWidth={cellWidth}>
        {children}
      </FeedRow>
    )
  }
  if (cellWidth !== undefined) {
    return <SizedStacks cellWidth={cellWidth}>{children}</SizedStacks>
  }
  return <FeedStacks form="masonry">{children}</FeedStacks>
}

function MediaFeed({
  label,
  layout = "masonry",
  content = "media",
  header,
  viewAll,
  rowLabels,
  cellWidth,
  isClipped = false,
  children,
  className,
}: MediaFeedProps): ReactElement {
  const isWindowed =
    layout === "masonry" && (viewAll !== undefined || isClipped)
  return (
    <section
      aria-label={label}
      data-slot="media-feed"
      data-layout={layout}
      data-content={content}
      className={cn("@container flex w-full flex-col", className)}
    >
      {header === undefined ? null : (
        <div data-slot="media-feed-header" className="mb-s6">
          {header}
        </div>
      )}
      <div
        data-slot="media-feed-window"
        className={cn(
          "relative",
          interaction.ringRoom,
          isWindowed
            ? "max-h-[calc(var(--spacing-feed-window)+var(--spacing-focus-ring)*4)] overflow-hidden"
            : ""
        )}
      >
        <FeedItems
          layout={layout}
          content={content}
          {...(rowLabels === undefined ? {} : { rowLabels })}
          {...(cellWidth === undefined ? {} : { cellWidth })}
        >
          {children}
        </FeedItems>
        {isWindowed ? (
          <div
            data-slot="media-feed-fade"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-feed-fade items-end justify-center bg-linear-to-t from-(--ground) to-transparent pb-s12"
          >
            {viewAll}
          </div>
        ) : null}
      </div>
      {viewAll !== undefined && !isWindowed ? (
        <div data-slot="media-feed-foot" className="mt-s6 flex justify-center">
          {viewAll}
        </div>
      ) : null}
    </section>
  )
}

export type { MediaFeedContent, MediaFeedProps, RowLabels, ViewAllProps }
export { FeedStacks, feedColumnsOf, MediaFeed, packStacks, ViewAll }
