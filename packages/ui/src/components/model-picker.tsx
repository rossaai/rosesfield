import { Input } from "@rosesfield/ui/components/input"
import {
  type ListSection,
  LoadingRows,
  ModelList,
  ScrollRegion,
} from "@rosesfield/ui/components/model-list"
import type {
  ModelBadge,
  ModelPickerRow,
  ModelPickerTag,
  ModelPrice,
  ModelRank,
} from "@rosesfield/ui/components/model-row"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { ViewMenu } from "@rosesfield/ui/components/view-menu"
import {
  hasOpenWeights,
  isModelPickerSort,
  isOpenRow,
  type ModelPickerSort,
  modelPickerSorts,
  needleOf,
  recentRowsOf,
  sortedRows,
} from "@rosesfield/ui/lib/model-sections"
import { ListFilterIcon } from "lucide-react"
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"

type ModelPickerWords = Record<
  | "title"
  | "search"
  | "searchPlaceholder"
  | "empty"
  | "sort"
  | "sortFilter"
  | ModelPickerSort
  | "openOnly"
  | "recent"
  | "all",
  string
>

type ModelPickerProps = {
  trigger: ReactElement
  words: ModelPickerWords
  rows: readonly ModelPickerRow[]
  chosen: string | null
  onChoose: (id: string) => void
  recent?: readonly string[]
  isLoading?: boolean
  isPricing?: boolean
  notice?: ReactNode
  side?: "top" | "right"
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function SortMenu(props: {
  words: ModelPickerWords
  sort: ModelPickerSort
  isOpenOnly: boolean
  hasOpen: boolean
  onSort: (sort: ModelPickerSort) => void
  onOpenOnly: (isOpenOnly: boolean) => void
}): ReactElement {
  const { words } = props
  return (
    <ViewMenu
      label={words.sortFilter}
      trigger="filled"
      icon={<ListFilterIcon aria-hidden="true" />}
      sort={{
        id: "sort",
        label: words.sort,
        value: props.sort,
        options: modelPickerSorts.map((sort) => ({
          value: sort,
          label: words[sort],
        })),
        onValueChange: (value) => {
          if (isModelPickerSort(value)) {
            props.onSort(value)
          }
        },
      }}
      switches={
        props.hasOpen
          ? [
              {
                id: "open",
                label: words.openOnly,
                checked: props.isOpenOnly,
                onCheckedChange: props.onOpenOnly,
              },
            ]
          : []
      }
    />
  )
}

function Toolbar(props: {
  search: RefObject<HTMLInputElement | null>
  words: ModelPickerWords
  query: string
  onQuery: (query: string) => void
  sort: ReactNode
}): ReactElement {
  return (
    <div
      data-slot="model-picker-toolbar"
      className="flex shrink-0 items-center gap-s2 px-s3 py-s3"
    >
      <Input
        ref={props.search}
        type="search"
        data-slot="model-picker-search"
        aria-label={props.words.search}
        placeholder={props.words.searchPlaceholder}
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        className="h-button-dense max-w-none flex-1"
      />
      {props.sort}
    </div>
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

const noRecent: readonly string[] = []

function sectionsOf(
  rows: readonly ModelPickerRow[],
  recent: readonly string[],
  sort: ModelPickerSort,
  isOpenOnly: boolean,
  words: ModelPickerWords
): ListSection[] {
  const kept = isOpenOnly ? rows.filter(isOpenRow) : rows
  return [
    { id: "recent", label: words.recent, rows: recentRowsOf(kept, recent) },
    { id: "all", label: words.all, rows: sortedRows(kept, sort) },
  ]
}

function PickerBody(
  props: ModelPickerProps & {
    search: RefObject<HTMLInputElement | null>
    onChosen: () => void
  }
): ReactElement {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<ModelPickerSort>("rankBest")
  const [isOpenOnly, setOpenOnly] = useState(false)
  const recent = props.recent ?? noRecent
  const hasOpen = useMemo(() => hasOpenWeights(props.rows), [props.rows])
  const sections = useMemo(
    () =>
      sectionsOf(props.rows, recent, sort, isOpenOnly && hasOpen, props.words),
    [props.rows, recent, sort, isOpenOnly, hasOpen, props.words]
  )
  const latest = useRef(props)
  latest.current = props
  const choose = useCallback((id: string) => {
    latest.current.onChoose(id)
    latest.current.onChosen()
  }, [])
  return (
    <>
      <Toolbar
        search={props.search}
        words={props.words}
        query={query}
        onQuery={setQuery}
        sort={
          <SortMenu
            words={props.words}
            sort={sort}
            isOpenOnly={isOpenOnly}
            hasOpen={hasOpen}
            onSort={setSort}
            onOpenOnly={setOpenOnly}
          />
        }
      />
      {props.notice}
      <ScrollRegion>
        {props.isLoading === true ? (
          <LoadingRows />
        ) : (
          <ModelList
            sections={sections}
            title={props.words.title}
            emptyLabel={props.words.empty}
            needle={needleOf(query)}
            chosen={props.chosen}
            isPricing={props.isPricing === true}
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
        <PopoverTitle className="sr-only">{props.words.title}</PopoverTitle>
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
  ModelPickerProps,
  ModelPickerRow,
  ModelPickerSort,
  ModelPickerTag,
  ModelPickerWords,
  ModelPrice,
  ModelRank,
}
export { ModelPicker }
