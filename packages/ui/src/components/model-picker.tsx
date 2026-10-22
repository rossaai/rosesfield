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
import { SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { SearchIcon, SparkleIcon } from "lucide-react"
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  type UIEvent,
  useRef,
  useState,
} from "react"

type ModelPickerSection = {
  id: string
  label: string
  rows: readonly ModelPickerRow[]
}

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
  settings?: ReactNode
  side?: "top" | "right"
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const featuredId = "featured"

function labOf(row: ModelPickerRow): string {
  return row.lab ?? row.maker
}

function matches(row: ModelPickerRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return (
    needle === "" ||
    row.name.toLowerCase().includes(needle) ||
    row.maker.toLowerCase().includes(needle) ||
    labOf(row).toLowerCase().includes(needle)
  )
}

function labSectionsOf(
  sections: readonly ModelPickerSection[]
): ModelPickerSection[] {
  const featured = sections.filter((section) => section.id === featuredId)
  const seen = new Set<string>(
    featured.flatMap((section) => section.rows.map((row) => row.id))
  )
  const byLab = new Map<string, ModelPickerRow[]>()
  for (const section of sections) {
    if (section.id === featuredId) {
      continue
    }
    for (const row of section.rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        byLab.set(labOf(row), [...(byLab.get(labOf(row)) ?? []), row])
      }
    }
  }
  const labs = [...byLab.entries()].sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  )
  return [
    ...featured,
    ...labs.map(([lab, rows]) => ({ id: `lab:${lab}`, label: lab, rows })),
  ]
}

function filterSections(
  sections: readonly ModelPickerSection[],
  query: string
): ModelPickerSection[] {
  return sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => matches(row, query)),
    }))
    .filter((section) => section.rows.length > 0)
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

function SectionRows(
  props: ModelPickerProps & {
    section: ModelPickerSection
    onChosen: () => void
  }
): ReactElement {
  return (
    <fieldset
      aria-label={props.section.label}
      className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0"
    >
      <p
        data-slot="model-section-heading"
        className="flex h-button-small items-center gap-s1_5 px-s4 font-medium text-label text-ink-muted [&_svg]:glyph-small"
      >
        {props.section.id === featuredId ? (
          <SparkleIcon aria-hidden="true" />
        ) : null}
        {props.section.label}
      </p>
      {props.section.rows.map((row) => (
        <ModelRow
          key={`${props.section.id}:${row.id}`}
          row={row}
          isChosen={row.id === props.chosen}
          isPricing={props.isPricing === true}
          onChoose={(id) => {
            props.onChoose(id)
            props.onChosen()
          }}
        />
      ))}
    </fieldset>
  )
}

function ModelList(
  props: ModelPickerProps & { query: string; onChosen: () => void }
): ReactNode {
  if (props.isLoading === true) {
    return <LoadingRows />
  }
  const sections = filterSections(labSectionsOf(props.sections), props.query)
  if (sections.length === 0) {
    const isRefused = props.notice !== undefined && props.notice !== null
    return isRefused && props.query === "" ? null : (
      <p className="px-3 py-2 text-body text-ink-muted">{props.emptyLabel}</p>
    )
  }
  return (
    <div role="listbox" aria-label={props.title} className="flex flex-col pb-1">
      {sections.map((section) => (
        <SectionRows key={section.id} {...props} section={section} />
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

function ModelPicker(props: ModelPickerProps): ReactElement {
  const [query, setQuery] = useState("")
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
    if (!open) {
      setQuery("")
    }
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
        material="thick"
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
        <SearchRow
          search={search}
          label={props.searchLabel}
          placeholder={props.searchPlaceholder}
          query={query}
          onQuery={setQuery}
        />
        {props.notice}
        <ScrollRegion>
          <ModelList {...props} query={query} onChosen={() => setOpen(false)} />
        </ScrollRegion>
        {props.settings === undefined || props.settings === null ? null : (
          <div
            data-slot="model-settings"
            className="flex max-h-list-max min-h-0 flex-col gap-s4 overflow-y-auto border-t border-(--line) px-3 pt-3 pb-2"
          >
            {props.settings}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export type {
  ModelBadge,
  ModelPickerProps,
  ModelPickerRow,
  ModelPickerSection,
  ModelPickerTag,
  ModelPrice,
}
export { filterSections, labSectionsOf, ModelPicker }
