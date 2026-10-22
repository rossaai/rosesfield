import { Button } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { Slider } from "@rosesfield/ui/components/slider"
import { LayoutGridIcon, ListIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useId } from "react"

type ViewLayout = "list" | "grid"

type ViewOption = {
  value: string
  label: string
  lead?: ReactNode
}

type ViewFacet = {
  id: string
  label: string
  value: string
  options: ReadonlyArray<ViewOption>
  onValueChange: (value: string) => void
}

type ViewSize = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onValueChange: (value: number) => void
}

type ViewMenuProps = {
  label: string
  layoutLabel: string
  listLabel: string
  gridLabel: string
  layout: ViewLayout
  onLayoutChange: (layout: ViewLayout) => void
  size?: ViewSize
  filterLabel?: string
  facets?: ReadonlyArray<ViewFacet>
}

function isLayout(value: unknown): value is ViewLayout {
  return value === "list" || value === "grid"
}

function SizeRow({ size }: { size: ViewSize }): ReactElement {
  const id = useId()
  return (
    <div
      data-slot="view-menu-size"
      className="flex min-h-button items-center gap-s3 py-s2 ps-[calc(var(--spacing-s4)+var(--menu-lead,0px))] pe-s4"
    >
      <span id={id} className="shrink-0 text-body text-ink">
        {size.label}
      </span>
      <Slider
        aria-labelledby={id}
        min={size.min}
        max={size.max}
        step={size.step ?? 1}
        value={size.value}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value
          if (typeof next === "number") {
            size.onValueChange(next)
          }
        }}
        className="min-w-32 flex-1"
      />
    </div>
  )
}

function chosenLabelOf(facet: ViewFacet): string | undefined {
  return facet.options.find((option) => option.value === facet.value)?.label
}

function FacetMenu({ facet }: { facet: ViewFacet }): ReactElement {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span className="min-w-0 flex-1 truncate">{facet.label}</span>
        <span className="shrink-0 truncate text-ink-muted">
          {chosenLabelOf(facet)}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={facet.value}
          onValueChange={(value) => {
            if (typeof value === "string") {
              facet.onValueChange(value)
            }
          }}
        >
          {facet.options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              lead={option.lead}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

function ViewMenu(props: ViewMenuProps): ReactElement {
  const facets = props.facets ?? []
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button data-slot="view-menu" tone="quiet" size="dense">
            <LayoutGridIcon aria-hidden="true" />
            {props.label}
          </Button>
        }
      />
      <DropdownMenuContent align="end" data-slot="view-menu-content">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{props.layoutLabel}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={props.layout}
            onValueChange={(value) => {
              if (isLayout(value)) {
                props.onLayoutChange(value)
              }
            }}
          >
            <DropdownMenuRadioItem value="list" lead={<ListIcon />}>
              {props.listLabel}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid" lead={<LayoutGridIcon />}>
              {props.gridLabel}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {props.size === undefined ? null : <SizeRow size={props.size} />}
        {facets.length === 0 ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {props.filterLabel === undefined ? null : (
                <DropdownMenuLabel>{props.filterLabel}</DropdownMenuLabel>
              )}
              {facets.map((facet) => (
                <FacetMenu key={facet.id} facet={facet} />
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type { ViewFacet, ViewLayout, ViewMenuProps, ViewOption, ViewSize }
export { ViewMenu }
