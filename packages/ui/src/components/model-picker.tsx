import { Badge } from "@rosesfield/ui/components/badge"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CheckIcon, SearchIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"

type ModelPickerTag = {
  label: string
  icon?: ReactNode
}

type ModelPickerRow = {
  id: string
  name: string
  maker: string
  line: string | null
  tags: readonly ModelPickerTag[]
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
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const rowClass = cn(
  "flex w-full cursor-default items-start gap-s3 rounded-item px-s4 py-s2 text-left outline-none hover:bg-(--tint) focus-visible:bg-(--tint)",
  motion.tint
)

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
    <button
      type="button"
      role="option"
      aria-selected={isChosen}
      data-model={row.id}
      className={rowClass}
      onClick={() => onChoose(row.id)}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-s1">
        <span className="flex min-w-0 items-baseline gap-s1_5">
          <span className="truncate font-medium text-body text-ink">
            {row.name}
          </span>
          <span className="shrink-0 text-caption text-ink-muted">
            {row.maker}
          </span>
        </span>
        <RowFacts row={row} />
      </span>
      {isChosen ? (
        <CheckIcon aria-hidden="true" className="glyph mt-s1 text-ink" />
      ) : null}
    </button>
  )
}

function RowFacts({ row }: { row: ModelPickerRow }): ReactNode {
  if (row.tags.length > 0) {
    return (
      <span className="flex flex-wrap gap-s1">
        {row.tags.map((tag) => (
          <Badge key={tag.label} tone="neutral" className="[&_svg]:glyph-small">
            {tag.icon}
            {tag.label}
          </Badge>
        ))}
      </span>
    )
  }
  return row.line === null ? null : (
    <span className="truncate text-caption text-ink-muted">{row.line}</span>
  )
}

function LoadingRows(): ReactElement {
  return (
    <div className="flex flex-col gap-s3 px-s4 py-s2">
      {["first", "second", "third", "fourth"].map((key) => (
        <div key={key} className="flex flex-col gap-s1">
          <Skeleton className="h-s4 w-1/2" />
          <Skeleton className="h-s3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

function ModelList(
  props: ModelPickerProps & { query: string; onChosen: () => void }
): ReactElement {
  if (props.isLoading === true) {
    return <LoadingRows />
  }
  const sections = filterSections(props.sections, props.query)
  if (sections.length === 0) {
    return (
      <p className="px-s4 py-s3 text-body text-ink-muted">{props.emptyLabel}</p>
    )
  }
  return (
    <div
      role="listbox"
      aria-label={props.title}
      className="flex flex-col gap-s2"
    >
      {sections.map((section) => (
        <fieldset key={section.id} className="m-0 min-w-0 border-0 p-0">
          <legend className="px-s4 py-s1_5 font-medium text-label text-ink-muted">
            {section.label}
          </legend>
          {section.rows.map((row) => (
            <ModelRow
              key={`${section.id}:${row.id}`}
              row={row}
              isChosen={row.id === props.chosen}
              onChoose={(id) => {
                props.onChoose(id)
                props.onChosen()
              }}
            />
          ))}
        </fieldset>
      ))}
    </div>
  )
}

function ModelPicker(props: ModelPickerProps): ReactElement {
  const [query, setQuery] = useState("")
  const [isOpenHere, setOpenHere] = useState(props.defaultOpen === true)
  const isOpen = props.open ?? isOpenHere
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
        className="w-dialog max-w-[min(var(--spacing-dialog),calc(100vw-2*var(--spacing-s4)))] gap-s2 p-s2_5"
      >
        <PopoverTitle className="sr-only">{props.title}</PopoverTitle>
        <label className="flex h-field items-center gap-s2 rounded-full bg-(--well) px-s5">
          <SearchIcon aria-hidden="true" className="glyph text-ink-muted" />
          <input
            type="search"
            aria-label={props.searchLabel}
            placeholder={props.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
        {props.notice}
        <div className="max-h-[min(60dvh,var(--spacing-dialog))] overflow-y-auto">
          <ModelList {...props} query={query} onChosen={() => setOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export type {
  ModelPickerProps,
  ModelPickerRow,
  ModelPickerSection,
  ModelPickerTag,
}
export { filterSections, ModelPicker }
