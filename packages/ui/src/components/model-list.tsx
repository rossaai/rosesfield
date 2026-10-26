import { menuLabelClass } from "@rosesfield/ui/components/dropdown-menu"
import {
  type ModelPickerRow,
  ModelRow,
  ModelRowSkeleton,
} from "@rosesfield/ui/components/model-row"
import { SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { isMatch, searchedRowsOf } from "@rosesfield/ui/lib/model-sections"
import { motion } from "@rosesfield/ui/motion"
import {
  type ReactElement,
  type ReactNode,
  type UIEvent,
  useId,
  useMemo,
  useState,
} from "react"

function LoadingRows(): ReactElement {
  return (
    <SkeletonGroup className="flex flex-col gap-s1 px-s3 py-s2">
      {["first", "second", "third", "fourth"].map((key) => (
        <ModelRowSkeleton key={key} />
      ))}
    </SkeletonGroup>
  )
}

type ListSection = {
  id: "recent" | "all"
  label: string
  rows: readonly ModelPickerRow[]
}

function SectionRows(props: {
  section: ListSection
  needle: string
  hasLabel: boolean
  chosen: string | null
  isPricing: boolean
  onChoose: (id: string) => void
}): ReactNode {
  const labelId = useId()
  const searched = useMemo(
    () => searchedRowsOf(props.section.rows),
    [props.section.rows]
  )
  const shown = searched.map(({ row, text }) => ({
    row,
    isShown: isMatch(text, props.needle),
  }))
  if (!shown.some((one) => one.isShown)) {
    return null
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a listbox holds its options in groups, and a fieldset is no listbox group
    <div
      role="group"
      data-slot="model-list-section"
      data-section={props.section.id}
      aria-labelledby={props.hasLabel ? labelId : undefined}
      aria-label={props.hasLabel ? undefined : props.section.label}
      className="flex flex-col gap-1"
    >
      {props.hasLabel ? (
        <p
          id={labelId}
          role="presentation"
          data-slot="model-list-label"
          className={cn(menuLabelClass, "mx-s3 px-s2 pt-s2")}
        >
          {props.section.label}
        </p>
      ) : null}
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

function hasShownRow(rows: readonly ModelPickerRow[], needle: string): boolean {
  return searchedRowsOf(rows).some(({ text }) => isMatch(text, needle))
}

function ModelList(props: {
  sections: readonly ListSection[]
  title: string
  emptyLabel: string
  needle: string
  chosen: string | null
  isPricing: boolean
  isRefused: boolean
  onChoose: (id: string) => void
}): ReactNode {
  const [recent, all] = props.sections
  const hasAll = all !== undefined && hasShownRow(all.rows, props.needle)
  if (!hasAll) {
    return props.isRefused && props.needle === "" ? null : (
      <p className="px-3 py-2 text-body text-ink-muted">{props.emptyLabel}</p>
    )
  }
  const hasLabel =
    recent !== undefined &&
    recent.rows.length > 0 &&
    hasShownRow(recent.rows, props.needle)
  return (
    <div
      role="listbox"
      aria-label={props.title}
      className="flex flex-col gap-1 pb-1"
    >
      {props.sections.map((section) => (
        <SectionRows
          key={section.id}
          section={section}
          needle={props.needle}
          hasLabel={hasLabel}
          chosen={props.chosen}
          isPricing={props.isPricing}
          onChoose={props.onChoose}
        />
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

export type { ListSection }
export { LoadingRows, ModelList, ScrollRegion }
