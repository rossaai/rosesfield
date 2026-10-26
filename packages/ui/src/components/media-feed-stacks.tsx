import {
  ArrivalIndex,
  type MediaAspect,
} from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

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

type FeedColumns = { count: number; fills: boolean }

function feedColumnsOf(
  items: number,
  available: number,
  cellWidth: number,
  gap: number
): FeedColumns {
  const fit = Math.max(1, Math.floor((available + gap) / (cellWidth + gap)))
  return { count: Math.max(1, Math.min(fit, items)), fills: items >= fit }
}

type Room = { width: number; gap: number }

function readRoom(element: HTMLElement): Room {
  const gap = Number.parseFloat(getComputedStyle(element).columnGap)
  return { width: element.clientWidth, gap: Number.isNaN(gap) ? 0 : gap }
}

function useRoom(box: RefObject<HTMLDivElement | null>): Room {
  const [room, setRoom] = useState<Room>({ width: 0, gap: 0 })
  const update = (): void => {
    const element = box.current
    if (element === null) {
      return
    }
    const next = readRoom(element)
    setRoom((was) =>
      was.width === next.width && was.gap === next.gap ? was : next
    )
  }
  useLayoutEffect(update)
  useEffect(() => {
    const element = box.current
    if (element === null || typeof ResizeObserver === "undefined") {
      return
    }
    const observer = new ResizeObserver(() => {
      const next = readRoom(element)
      setRoom((was) =>
        was.width === next.width && was.gap === next.gap ? was : next
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [box])
  return room
}

function useStackItems(
  box: RefObject<HTMLDivElement | null>,
  children: ReactNode,
  count: number
): { items: ReactNode[]; stacks: number[][] } {
  const items = Children.toArray(children)
  const identity = items
    .map((item) => (isValidElement(item) ? String(item.key) : ""))
    .join("|")
  const measured = useMeasuredHeights(
    box,
    items.length,
    identity === "" ? "" : `${count}:${identity}`
  )
  const heights =
    measured !== null && measured.length === items.length
      ? measured
      : items.map((item) => relativeHeightOf(aspectOf(item)))
  return { items, stacks: packStacks(heights, count) }
}

function StackCells({
  places,
  items,
}: {
  places: readonly number[]
  items: readonly ReactNode[]
}): ReactElement {
  return (
    <>
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
    </>
  )
}

function SizedStacks({
  cellWidth,
  children,
}: {
  cellWidth: number
  children: ReactNode
}): ReactElement {
  const box = useRef<HTMLDivElement>(null)
  const room = useRoom(box)
  const columns = feedColumnsOf(
    Children.count(children),
    room.width,
    cellWidth,
    room.gap
  )
  const { items, stacks } = useStackItems(box, children, columns.count)
  return (
    <div
      ref={box}
      data-slot="media-feed-items"
      data-stacks="masonry"
      data-cell={cellWidth}
      data-fills={columns.fills ? "" : undefined}
      className="flex items-start gap-s2"
    >
      {stacks.map((places, column) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a column's place is its identity
          key={column}
          data-slot="media-feed-stack"
          className={cn(
            "flex min-w-0 flex-col gap-s2",
            columns.fills ? "flex-1" : "shrink-0"
          )}
          style={columns.fills ? undefined : { width: cellWidth }}
        >
          <StackCells places={places} items={items} />
        </div>
      ))}
    </div>
  )
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
  const { items, stacks } = useStackItems(box, children, count)
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
          <StackCells places={places} items={items} />
        </div>
      ))}
    </div>
  )
}

export type { FeedColumns, StackForm }
export { FeedStacks, feedColumnsOf, packStacks, SizedStacks }
