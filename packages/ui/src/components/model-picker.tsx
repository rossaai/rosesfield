import { Badge, type BadgeKind } from "@rosesfield/ui/components/badge"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { CheckIcon, SearchIcon, SparkleIcon } from "lucide-react"
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  type UIEvent,
  useRef,
  useState,
} from "react"

type ModelPickerTag = {
  label: string
  icon?: ReactNode
}

type ModelBadge = {
  kind: BadgeKind
  label: string
  href?: string
  mark?: ReactNode
}

type ModelPickerRow = {
  id: string
  name: string
  maker: string
  line: string | null
  tags: readonly ModelPickerTag[]
  mark?: ReactNode
  badges?: readonly ModelBadge[]
}

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
  notice?: ReactNode
  settings?: ReactNode
  side?: "top" | "right"
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function matches(row: ModelPickerRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return (
    needle === "" ||
    row.name.toLowerCase().includes(needle) ||
    row.maker.toLowerCase().includes(needle)
  )
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

function RowBadge({ badge }: { badge: ModelBadge }): ReactElement {
  return (
    <Badge
      kind={badge.kind}
      {...(badge.href === undefined ? {} : { href: badge.href })}
      {...(badge.mark === undefined ? {} : { mark: badge.mark })}
    >
      {badge.label}
    </Badge>
  )
}

function RowName({ row }: { row: ModelPickerRow }): ReactElement {
  const badges = row.badges ?? []
  const facts = badges.filter((badge) => badge.kind !== "openWeights")
  const weights = badges.filter((badge) => badge.kind === "openWeights")
  return (
    <span className="flex min-w-0 items-center">
      <span data-slot="model-row-name" className="truncate text-body text-ink">
        {row.name}
      </span>
      {facts.length === 0 ? null : (
        <span data-slot="model-row-badges" className="flex shrink-0">
          {facts.map((badge) => (
            <RowBadge key={badge.kind} badge={badge} />
          ))}
        </span>
      )}
      {weights.length === 0 ? null : (
        <span data-slot="model-row-weights" className="flex shrink-0">
          {weights.map((badge) => (
            <RowBadge key={badge.kind} badge={badge} />
          ))}
        </span>
      )}
    </span>
  )
}

function RowLine({ row }: { row: ModelPickerRow }): ReactNode {
  if (row.line === null && row.tags.length === 0) {
    return null
  }
  return (
    <span
      data-slot="model-row-line"
      className="flex min-w-0 flex-wrap items-center gap-x-1 overflow-hidden text-caption whitespace-nowrap text-ink-muted"
    >
      {row.line === null ? null : (
        <span data-slot="model-row-words" className="max-w-full truncate">
          {row.line}
        </span>
      )}
      {row.tags.length === 0 ? null : (
        <span
          data-slot="model-row-tags"
          className="flex max-w-full shrink-0 gap-1 overflow-hidden"
        >
          {row.tags.map((tag) => (
            <span
              key={tag.label}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-dense bg-(--tint) px-1 [&_svg]:size-3"
            >
              {tag.icon}
              {tag.label}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

function ModelRow({
  row,
  isChosen,
  onChoose,
}: {
  row: ModelPickerRow
  isChosen: boolean
  onChoose: (id: string) => void
}): ReactElement {
  return (
    <div
      role="none"
      data-slot="model-row"
      data-chosen={isChosen ? "yes" : "no"}
      className="group/row relative mx-3 h-13 rounded-cell data-[chosen=yes]:bg-(--tint)"
    >
      <button
        type="button"
        role="option"
        aria-selected={isChosen}
        aria-label={row.name}
        data-model={row.id}
        className={cn(
          "absolute inset-0 rounded-cell outline-none",
          interaction.light,
          interaction.ring
        )}
        onClick={() => onChoose(row.id)}
      />
      <span className="pointer-events-none relative flex h-full items-center ps-1.5 pe-3">
        <span
          data-slot="model-row-mark"
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-dense bg-(--tint) text-ink-muted group-data-[chosen=yes]/row:text-ink [&_svg]:size-4"
        >
          {row.mark}
        </span>
        <span className="ms-2 flex min-w-0 flex-1 flex-col">
          <RowName row={row} />
          <RowLine row={row} />
        </span>
        <span data-slot="model-row-check" className="flex size-5 shrink-0">
          {isChosen ? (
            <CheckIcon aria-hidden="true" className="size-5" />
          ) : null}
        </span>
      </span>
    </div>
  )
}

function LoadingRows(): ReactElement {
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      {["first", "second", "third", "fourth"].map((key) => (
        <Skeleton key={key} className="h-13 w-full rounded-cell" />
      ))}
    </div>
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
      <p className="flex h-8.5 items-center gap-1.5 px-3 font-medium text-label text-ink-muted">
        <SparkleIcon aria-hidden="true" className="size-3.5" />
        {props.section.label}
      </p>
      {props.section.rows.map((row) => (
        <ModelRow
          key={`${props.section.id}:${row.id}`}
          row={row}
          isChosen={row.id === props.chosen}
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
  const sections = filterSections(props.sections, props.query)
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

const fadeClass =
  "pointer-events-none absolute inset-x-0 z-10 h-9.5 from-(--ground) to-transparent transition-opacity duration-(--duration-control)"

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
    <label className="flex h-10.5 shrink-0 items-center gap-2 border-b border-(--line) px-3">
      <SearchIcon aria-hidden="true" className="size-6 text-ink-muted" />
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

function ModelPicker(props: ModelPickerProps): ReactElement {
  const [query, setQuery] = useState("")
  const search = useRef<HTMLInputElement>(null)
  const [isOpenHere, setOpenHere] = useState(props.defaultOpen === true)
  const isOpen = props.open ?? isOpenHere
  const side = props.side ?? "top"
  const setOpen = (open: boolean): void => {
    setOpenHere(open)
    props.onOpenChange?.(open)
    if (!open) {
      setQuery("")
    }
  }
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger render={props.trigger} />
      <PopoverContent
        data-slot="model-picker"
        initialFocus={search}
        side={side}
        align={side === "top" ? "start" : "end"}
        sideOffset={side === "top" ? 4 : 8}
        motion="rise"
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
}
export { filterSections, ModelPicker }
