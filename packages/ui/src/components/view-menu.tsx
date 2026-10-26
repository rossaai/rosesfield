import {
  Button,
  type ButtonProps,
  IconButton,
} from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuLead,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSwitchItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { Slider } from "@rosesfield/ui/components/slider"
import { LayoutGridIcon, ListIcon, ScalingIcon } from "lucide-react"
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
  lead?: ReactNode
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

type ViewLayoutGroup = {
  layoutLabel: string
  listLabel: string
  gridLabel: string
  layout: ViewLayout
  onLayoutChange: (layout: ViewLayout) => void
}

type ViewSwitch = {
  id: string
  label: string
  lead?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

type ViewTriggerForm = "label" | "icon" | "filled"

type ViewMenuProps = {
  label: string
  trigger?: ViewTriggerForm
  icon?: ReactNode
  sorts?: ReadonlyArray<ViewFacet>
  switches?: ReadonlyArray<ViewSwitch>
  size?: ViewSize
  filterLabel?: string
  facets?: ReadonlyArray<ViewFacet>
} & (ViewLayoutGroup | { layout?: undefined })

function isLayout(value: unknown): value is ViewLayout {
  return value === "list" || value === "grid"
}

function SizeRow({ size }: { size: ViewSize }): ReactElement {
  const id = useId()
  return (
    <div
      data-slot="view-menu-size"
      className="flex min-h-button items-center gap-s3 py-s2 ps-s4 pe-s4"
    >
      <DropdownMenuLead lead={<ScalingIcon />} />
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
      <DropdownMenuSubTrigger lead={facet.lead}>
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

function SwitchRows({
  switches,
}: {
  switches: ReadonlyArray<ViewSwitch>
}): ReactElement {
  return (
    <DropdownMenuGroup>
      {switches.map((one) => (
        <DropdownMenuSwitchItem
          key={one.id}
          lead={one.lead}
          checked={one.checked}
          onCheckedChange={one.onCheckedChange}
        >
          {one.label}
        </DropdownMenuSwitchItem>
      ))}
    </DropdownMenuGroup>
  )
}

function LayoutGroup(props: ViewLayoutGroup): ReactElement {
  return (
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
  )
}

function ViewTrigger({
  label,
  trigger = "label",
  icon,
  ...props
}: ButtonProps & {
  label: string
  trigger?: ViewTriggerForm | undefined
  icon?: ReactNode
}): ReactElement {
  const glyph = icon ?? <LayoutGridIcon aria-hidden="true" />
  if (trigger === "filled") {
    const { size: _size, ...rest } = props
    return (
      <IconButton
        {...rest}
        data-slot="view-menu"
        label={label}
        tone="default"
        size="dense"
      >
        {glyph}
      </IconButton>
    )
  }
  if (trigger === "icon") {
    return (
      <Button
        {...props}
        data-slot="view-menu"
        tone="quiet"
        size="icon-dense"
        aria-label={label}
      >
        {glyph}
      </Button>
    )
  }
  return (
    <Button {...props} data-slot="view-menu" tone="quiet" size="dense">
      {glyph}
      {label}
    </Button>
  )
}

function ViewMenu(props: ViewMenuProps): ReactElement {
  const facets = props.facets ?? []
  const sorts = props.sorts ?? []
  const switches = props.switches ?? []
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <ViewTrigger
            label={props.label}
            trigger={props.trigger}
            icon={props.icon}
          />
        }
      />
      <DropdownMenuContent align="end" data-slot="view-menu-content">
        {sorts.length === 0 ? null : (
          <DropdownMenuGroup data-slot="view-menu-sort">
            {sorts.map((sort) => (
              <FacetMenu key={sort.id} facet={sort} />
            ))}
          </DropdownMenuGroup>
        )}
        {switches.length === 0 ? null : (
          <>
            {sorts.length === 0 ? null : <DropdownMenuSeparator />}
            <SwitchRows switches={switches} />
          </>
        )}
        {props.layout === undefined ? null : <LayoutGroup {...props} />}
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

export type {
  ViewFacet,
  ViewLayout,
  ViewLayoutGroup,
  ViewMenuProps,
  ViewOption,
  ViewSize,
  ViewSwitch,
  ViewTriggerForm,
}
export { ViewMenu, ViewTrigger }
