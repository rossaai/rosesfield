import { Button } from "@rosesfield/ui/components/button"
import {
  SettingGroup,
  SettingGroups,
} from "@rosesfield/ui/components/filter-chip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { Slider } from "@rosesfield/ui/components/slider"
import {
  ImageIcon,
  LayoutGridIcon,
  ListFilterIcon,
  ListIcon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"

export type ViewLayout = "list" | "grid"

export type FilterChoice = { value: string; label: string }

export type FilterGroup = {
  id: string
  name: string
  icon: ReactNode
  choices: readonly FilterChoice[]
  value: string
  onChoose: (value: string) => void
}

export const tileSizes = {
  min: 0,
  max: 4,
  initial: 2,
} as const

const layoutItems: SegmentedItem<ViewLayout>[] = [
  { value: "list", label: t("library.view.list"), icon: <ListIcon /> },
  { value: "grid", label: t("library.view.grid"), icon: <LayoutGridIcon /> },
]

function SizeSlider({
  size,
  onSize,
}: {
  size: number
  onSize: (size: number) => void
}): ReactElement {
  return (
    <div
      data-slot="view-size"
      className="hidden h-8 items-center gap-2 pr-3 pl-1 @regular:flex"
    >
      <span
        aria-hidden="true"
        className="flex size-6 items-center justify-center rounded-full bg-(--tint) [&_svg]:size-3.5"
      >
        <ImageIcon />
      </span>
      <div className="w-32">
        <Slider
          aria-label={t("library.view.size")}
          min={tileSizes.min}
          max={tileSizes.max}
          step={1}
          value={size}
          onValueChange={(next) =>
            onSize(typeof next === "number" ? next : (next[0] ?? size))
          }
        />
      </div>
    </div>
  )
}

function FilterChoices({ group }: { group: FilterGroup }): ReactElement {
  return (
    <>
      {group.choices.map((choice) => (
        <Button
          key={choice.value}
          size="small"
          tone={choice.value === group.value ? "primary" : "quiet"}
          aria-pressed={choice.value === group.value}
          onClick={() => group.onChoose(choice.value)}
        >
          {choice.label}
        </Button>
      ))}
    </>
  )
}

export function FilterMenu({
  groups,
}: {
  groups: readonly FilterGroup[]
}): ReactElement {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="bar" tone="quiet">
            <ListFilterIcon aria-hidden="true" />
            {t("library.filter")}
          </Button>
        }
      />
      <PopoverContent align="end">
        <SettingGroups>
          {groups.map((group) => (
            <SettingGroup
              key={group.id}
              name={group.name}
              count={group.choices.length}
              icon={group.icon}
            >
              <FilterChoices group={group} />
            </SettingGroup>
          ))}
        </SettingGroups>
      </PopoverContent>
    </Popover>
  )
}

type ViewClusterProps = {
  layout: ViewLayout
  onLayout: (layout: ViewLayout) => void
  size: number
  onSize: (size: number) => void
  groups: readonly FilterGroup[]
}

export function ViewCluster(props: ViewClusterProps): ReactElement {
  return (
    <>
      <div
        data-slot="view-pill"
        className="flex h-9 items-center gap-3 rounded-cell bg-(--well)"
      >
        <SizeSlider size={props.size} onSize={props.onSize} />
        <div
          data-slot="view-well"
          className="flex h-9 items-center rounded-dense bg-canvas p-0.5"
        >
          <SegmentedControl
            items={layoutItems}
            value={props.layout}
            onValueChange={props.onLayout}
            label={t("library.view.label")}
            density="row"
          />
        </div>
      </div>
      <FilterMenu groups={props.groups} />
    </>
  )
}
