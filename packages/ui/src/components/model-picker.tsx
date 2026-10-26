import { IconButton } from "@rosesfield/ui/components/button"
import { HuggingFaceMark } from "@rosesfield/ui/components/hugging-face-mark"
import {
  type ModelBadge,
  type ModelPickerRow,
  type ModelPickerTag,
  type ModelPrice,
  ModelRow,
  ModelRowSkeleton,
} from "@rosesfield/ui/components/model-row"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  hasOpenWeights,
  hasOrder,
  isMatch,
  type ModelPickerFilters,
  type ModelPickerOrder,
  type ModelPickerSection,
  type ModelPickerWeights,
  modelPickerOrders,
  needleOf,
  orderedRows,
  rowsOf,
  searchedRowsOf,
} from "@rosesfield/ui/lib/model-sections"
import { motion } from "@rosesfield/ui/motion"
import { SearchIcon } from "lucide-react"
import {
  memo,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type UIEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"

type ModelPickerProps = {
  trigger: ReactElement
  title: string
  searchLabel: string
  searchPlaceholder: string
  emptyLabel: string
  sections: readonly ModelPickerSection[]
  chosen: string | null
  onChoose: (id: string) => void
  isLoading?: boolean
  isPricing?: boolean
  notice?: ReactNode
  filters?: ModelPickerFilters
  recent?: readonly string[]
  side?: "top" | "right"
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function LoadingRows(): ReactElement {
  return (
    <SkeletonGroup className="flex flex-col gap-s1 px-s3 py-s2">
      {["first", "second", "third", "fourth"].map((key) => (
        <ModelRowSkeleton key={key} />
      ))}
    </SkeletonGroup>
  )
}

const noRecent: readonly string[] = []

function ModelList(props: {
  rows: readonly ModelPickerRow[]
  title: string
  emptyLabel: string
  needle: string
  chosen: string | null
  isPricing: boolean
  isRefused: boolean
  onChoose: (id: string) => void
}): ReactNode {
  const searched = useMemo(() => searchedRowsOf(props.rows), [props.rows])
  const shown = searched.map(({ row, text }) => ({
    row,
    isShown: isMatch(text, props.needle),
  }))
  if (!shown.some((one) => one.isShown)) {
    return props.isRefused && props.needle === "" ? null : (
      <p className="px-3 py-2 text-body text-ink-muted">{props.emptyLabel}</p>
    )
  }
  return (
    <div
      role="listbox"
      aria-label={props.title}
      className="flex flex-col gap-1 pb-1"
    >
      {shown.map(({ row, isShown }) => (
        <div key={row.id} role="none" hidden={!isShown}>
          <ModelRow
            row={row}
            isChosen={row.id === props.chosen}
            isPricing={props.isPricing}
            onChoose={props.onChoose}
          />
        </div>
      ))}
    </div>
  )
}

type Ends = { top: boolean; bottom: boolean }

function readEnds(element: HTMLElement): Ends {
  return {
    top: element.scrollTop > 0,
    bottom: element.scrollTop + element.clientHeight < element.scrollHeight,
  }
}

const fadeClass = cn(
  "pointer-events-none absolute inset-x-0 z-10 h-s12 from-(--ground) to-transparent",
  motion.tint
)

function ScrollRegion({ children }: { children: ReactNode }): ReactElement {
  const [ends, setEnds] = useState<Ends>({ top: false, bottom: true })
  const onScroll = (event: UIEvent<HTMLDivElement>): void => {
    setEnds(readEnds(event.currentTarget))
  }
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <span
        data-slot="model-list-fade"
        data-end="top"
        className={cn(
          fadeClass,
          "top-0 bg-linear-to-b",
          ends.top ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]"
      >
        {children}
      </div>
      <span
        data-slot="model-list-fade"
        data-end="bottom"
        className={cn(
          fadeClass,
          "bottom-0 bg-linear-to-t",
          ends.bottom ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}

function SearchRow(props: {
  search: RefObject<HTMLInputElement | null>
  label: string
  placeholder: string
  query: string
  onQuery: (query: string) => void
}): ReactElement {
  return (
    <label className="flex h-field shrink-0 items-center gap-s2 border-b border-(--line) px-s4">
      <SearchIcon aria-hidden="true" className="glyph text-ink-muted" />
      <input
        ref={props.search}
        type="search"
        aria-label={props.label}
        placeholder={props.placeholder}
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
      />
    </label>
  )
}

type Placement = {
  anchor: () => Element | null
  padding: { top: number; right: number; bottom: number; left: number }
  origin: string
}

function insetOf(name: string): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  )
  return Number.isFinite(value) ? value : 0
}

function vesselOf(trigger: HTMLElement): Element {
  return trigger.closest("[data-slot='composer']") ?? trigger
}

function placementOf(trigger: HTMLElement | null): Placement | null {
  if (trigger === null) {
    return null
  }
  const vessel = vesselOf(trigger)
  const inset = insetOf("--spacing-s4")
  const bar = document
    .querySelector("header[data-slot='app-bar']")
    ?.getBoundingClientRect()
  const chip = trigger.getBoundingClientRect()
  const box = vessel.getBoundingClientRect()
  const gap = insetOf("--spacing-s2_5")
  const x = chip.left + chip.width / 2 - box.left
  const y = chip.top + chip.height / 2 - box.top + gap
  return {
    anchor: () => vesselOf(trigger),
    padding: {
      top: Math.max(inset, (bar?.bottom ?? 0) + inset),
      right: inset,
      bottom: inset,
      left: inset,
    },
    origin: `${x}px calc(100% + ${y}px)`,
  }
}

function OrderStripView(props: {
  rows: readonly ModelPickerRow[]
  filters: ModelPickerFilters | undefined
  recent: readonly string[]
  isPricing: boolean
  order: ModelPickerOrder
  weights: ModelPickerWeights
  onOrder: (order: ModelPickerOrder) => void
  onWeights: (weights: ModelPickerWeights) => void
}): ReactNode {
  const { filters } = props
  if (filters === undefined) {
    return null
  }
  const items = modelPickerOrders
    .filter((order) =>
      hasOrder(props.rows, order, props.recent, props.isPricing)
    )
    .map((order) => ({ value: order, label: filters[order] }))
  const hasWeights = hasOpenWeights(props.rows)
  if (items.length < 2 && !hasWeights) {
    return null
  }
  const isOpenOnly = props.weights === "open"
  return (
    <div
      data-slot="model-filters"
      data-density="row"
      className="flex items-center gap-s2 px-s3 pt-s2"
    >
      {items.length < 2 ? null : (
        <SegmentedControl
          items={items}
          value={props.order}
          onValueChange={props.onOrder}
          label={filters.order}
          density="row"
          className="min-w-0 flex-1"
        />
      )}
      {hasWeights ? (
        <IconButton
          size="small"
          tone="quiet"
          label={filters.open}
          data-slot="model-filter-open"
          aria-pressed={isOpenOnly}
          onClick={() => props.onWeights(isOpenOnly ? "all" : "open")}
          className="ms-auto shrink-0"
        >
          <HuggingFaceMark />
        </IconButton>
      ) : null}
    </div>
  )
}

const OrderStrip = memo(OrderStripView)

function PickerBody(
  props: ModelPickerProps & {
    search: RefObject<HTMLInputElement | null>
    onChosen: () => void
  }
): ReactElement {
  const [query, setQuery] = useState("")
  const [order, setOrder] = useState<ModelPickerOrder>("top")
  const [weights, setWeights] = useState<ModelPickerWeights>("all")
  const recent = props.recent ?? noRecent
  const rows = useMemo(() => rowsOf(props.sections), [props.sections])
  const isPricing = props.isPricing === true
  const isOrdered = hasOrder(rows, order, recent, isPricing)
  const shownRows = useMemo(() => {
    const ordered = orderedRows(rows, isOrdered ? order : "top", recent)
    return weights === "open"
      ? ordered.filter((row) => row.isOpen === true)
      : ordered
  }, [rows, order, isOrdered, recent, weights])
  const latest = useRef(props)
  latest.current = props
  const choose = useCallback((id: string) => {
    latest.current.onChoose(id)
    latest.current.onChosen()
  }, [])
  return (
    <>
      <SearchRow
        search={props.search}
        label={props.searchLabel}
        placeholder={props.searchPlaceholder}
        query={query}
        onQuery={setQuery}
      />
      <OrderStrip
        rows={rows}
        filters={props.filters}
        recent={recent}
        isPricing={isPricing}
        order={isOrdered ? order : "top"}
        weights={weights}
        onOrder={setOrder}
        onWeights={setWeights}
      />
      {props.notice}
      <ScrollRegion>
        {props.isLoading === true ? (
          <LoadingRows />
        ) : (
          <ModelList
            rows={shownRows}
            title={props.title}
            emptyLabel={props.emptyLabel}
            needle={needleOf(query)}
            chosen={props.chosen}
            isPricing={isPricing}
            isRefused={props.notice !== undefined && props.notice !== null}
            onChoose={choose}
          />
        )}
      </ScrollRegion>
    </>
  )
}

function ModelPicker(props: ModelPickerProps): ReactElement {
  const search = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [isOpenHere, setOpenHere] = useState(props.defaultOpen === true)
  const isOpen = props.open ?? isOpenHere
  const side = props.side ?? "top"
  const setOpen = (open: boolean): void => {
    if (open) {
      setPlacement(placementOf(trigger.current))
    }
    setOpenHere(open)
    props.onOpenChange?.(open)
  }
  const isAbove = side === "top" && placement !== null
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger ref={trigger} render={props.trigger} />
      <PopoverContent
        data-slot="model-picker"
        initialFocus={search}
        side={side}
        align={side === "top" ? "start" : "end"}
        sideOffset={insetOf("--spacing-s2_5")}
        {...(placement === null ? {} : { collisionPadding: placement.padding })}
        {...(isAbove
          ? {
              anchor: placement.anchor,
              style: { transformOrigin: placement.origin },
            }
          : {})}
        className="max-h-[min(var(--available-height),calc(var(--spacing)*160.5))] w-100.5 max-w-[calc(100vw-2*var(--spacing-s4))] gap-0 overflow-hidden p-px"
      >
        <PopoverTitle className="sr-only">{props.title}</PopoverTitle>
        <PickerBody
          {...props}
          search={search}
          onChosen={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

export type {
  ModelBadge,
  ModelPickerFilters,
  ModelPickerOrder,
  ModelPickerProps,
  ModelPickerRow,
  ModelPickerSection,
  ModelPickerTag,
  ModelPrice,
}
export { ModelPicker }
