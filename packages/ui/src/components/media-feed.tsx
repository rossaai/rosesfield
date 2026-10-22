import { useRender } from "@base-ui/react/use-render"
import { buttonVariants, IconButton } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  ArrivalIndex,
  type MediaAspect,
} from "@rosesfield/ui/components/media-tile"
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
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

type MediaFeedContent = "media" | "presets"

type StackForm = "masonry" | "presets"

const stackForms = {
  masonry: {
    count: 6,
    grid: "columns-2 @regular:grid-cols-6",
  },
  presets: {
    count: 5,
    grid: "columns-2 @regular:grid-cols-[repeat(5,minmax(0,--spacing(68.5)))] @regular:justify-center @regular:gap-x-2",
  },
} satisfies Record<StackForm, { count: number; grid: string }>

const square: MediaAspect = { width: 1, height: 1 }

function isAspect(value: unknown): value is MediaAspect {
  return (
    typeof value === "object" &&
    value !== null &&
    "width" in value &&
    "height" in value &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    value.width > 0 &&
    value.height > 0
  )
}

function aspectOf(child: ReactNode): MediaAspect {
  if (!isValidElement(child)) {
    return square
  }
  const props: unknown = child.props
  if (typeof props !== "object" || props === null || !("aspect" in props)) {
    return square
  }
  return isAspect(props.aspect) ? props.aspect : square
}

function packStacks(heights: readonly number[], count: number): number[][] {
  const stacks: number[][] = Array.from({ length: count }, () => [])
  const totals = Array.from({ length: count }, () => 0)
  heights.forEach((height, index) => {
    let shortest = 0
    for (let column = 1; column < count; column += 1) {
      if ((totals[column] ?? 0) < (totals[shortest] ?? 0)) {
        shortest = column
      }
    }
    stacks[shortest]?.push(index)
    totals[shortest] = (totals[shortest] ?? 0) + height
  })
  return stacks
}

function relativeHeightOf(aspect: MediaAspect): number {
  return aspect.height / aspect.width
}

function sameHeights(
  first: readonly number[] | null,
  second: readonly number[]
): boolean {
  return (
    first !== null &&
    first.length === second.length &&
    first.every((height, index) => height === second[index])
  )
}

function useMeasuredHeights(
  box: RefObject<HTMLDivElement | null>,
  count: number,
  identity: string
): readonly number[] | null {
  const [heights, setHeights] = useState<readonly number[] | null>(null)
  useLayoutEffect(() => {
    const element = box.current
    if (element === null || identity === "") {
      return
    }
    const cells = element.querySelectorAll<HTMLElement>(
      "[data-slot='media-feed-cell']"
    )
    const measured = Array.from({ length: count }, () => 0)
    for (const cell of cells) {
      const place = Number(cell.dataset.place)
      measured[place] = cell.offsetHeight / Math.max(1, cell.offsetWidth)
    }
    if (measured.every((height) => height > 0)) {
      setHeights((was) => (sameHeights(was, measured) ? was : measured))
    }
  }, [box, count, identity])
  return heights
}

function FeedStacks({
  form,
  children,
}: {
  form: StackForm
  children: ReactNode
}): ReactElement {
  const { count, grid } = stackForms[form]
  const box = useRef<HTMLDivElement>(null)
  const items = Children.toArray(children)
  const identity = items
    .map((item) => (isValidElement(item) ? String(item.key) : ""))
    .join("|")
  const measured = useMeasuredHeights(box, items.length, identity)
  const heights =
    measured !== null && measured.length === items.length
      ? measured
      : items.map((item) => relativeHeightOf(aspectOf(item)))
  const stacks = packStacks(heights, count)
  return (
    <div
      ref={box}
      data-slot="media-feed-items"
      data-stacks={form}
      className={cn("gap-s2 @regular:grid @regular:items-start", grid)}
    >
      {stacks.map((places, column) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a column's place is its identity
          key={column}
          data-slot="media-feed-stack"
          className="contents *:mb-s2 *:break-inside-avoid @regular:flex @regular:flex-col @regular:gap-s2 @regular:*:mb-0"
        >
          {places.map((place) => (
            <div
              key={place}
              data-slot="media-feed-cell"
              data-place={place}
              className="min-w-0"
            >
              <ArrivalIndex value={place}>{items[place]}</ArrivalIndex>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

type RowLabels = {
  previous: string
  next: string
}

const rowFade = "var(--spacing-s12)"

function FeedRow({
  labels,
  children,
}: {
  labels: RowLabels | undefined
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
          "flex snap-x gap-s2 overflow-x-auto [scrollbar-width:none] *:w-[calc((100%-var(--spacing-s2)*3)/3.4)] *:shrink-0 *:snap-start",
          interaction.ringRoomBlock
        )}
      >
        {items.map((item, place) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a tile's place in the row is its identity
          <div key={place} data-slot="media-feed-cell" className="min-w-0">
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
  isClipped?: boolean
  children: ReactNode
  className?: string
}

function FeedItems({
  layout,
  content,
  rowLabels,
  children,
}: Pick<MediaFeedProps, "rowLabels" | "children"> & {
  layout: MediaFeedLayout
  content: MediaFeedContent
}): ReactElement {
  if (content === "presets") {
    return <FeedStacks form="presets">{children}</FeedStacks>
  }
  if (layout === "row") {
    return <FeedRow labels={rowLabels}>{children}</FeedRow>
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
export { FeedStacks, MediaFeed, packStacks, ViewAll }
