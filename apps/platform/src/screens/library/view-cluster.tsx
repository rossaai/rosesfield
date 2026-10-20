import { Button } from "@rosesfield/ui/components/button"
import {
  SettingChoice,
  SettingGroup,
  SettingGroups,
} from "@rosesfield/ui/components/filter-chip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { Slider } from "@rosesfield/ui/components/slider"
import {
  SegmentedTab,
  SegmentedTabs,
  Tabs,
} from "@rosesfield/ui/components/tabs"
import {
  AudioLinesIcon,
  ImageIcon,
  LayoutGridIcon,
  ListFilterIcon,
  ListIcon,
  ShapesIcon,
  TypeIcon,
  VideoIcon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import type { OutputKind } from "@/catalog/app-facts"
import { t } from "@/copy/t"

export type ViewLayout = "list" | "grid"

export type FilterChoice = { value: string; label: string; picture: ReactNode }

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

export const kindPictures = {
  all: <ShapesIcon />,
  image: <ImageIcon />,
  video: <VideoIcon />,
  audio: <AudioLinesIcon />,
  text: <TypeIcon />,
} as const satisfies Record<OutputKind | "all", ReactNode>

const layouts = [
  { value: "list", label: t("library.view.list"), icon: <ListIcon /> },
  { value: "grid", label: t("library.view.grid"), icon: <LayoutGridIcon /> },
] as const satisfies ReadonlyArray<{
  value: ViewLayout
  label: string
  icon: ReactNode
}>

function layoutOf(value: unknown): ViewLayout | undefined {
  return layouts.find((layout) => layout.value === value)?.value
}

function LayoutSwitch({
  layout,
  onLayout,
}: {
  layout: ViewLayout
  onLayout: (layout: ViewLayout) => void
}): ReactElement {
  return (
    <Tabs
      value={layout}
      onValueChange={(next) => {
        const chosen = layoutOf(next)
        if (chosen !== undefined) {
          onLayout(chosen)
        }
      }}
      className="contents"
    >
      <SegmentedTabs form="well" aria-label={t("library.view.label")}>
        {layouts.map((one) => (
          <SegmentedTab key={one.value} value={one.value} icon={one.icon}>
            {one.label}
          </SegmentedTab>
        ))}
      </SegmentedTabs>
    </Tabs>
  )
}

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
        <SettingChoice
          key={choice.value}
          label={choice.label}
          picture={choice.picture}
          isCurrent={choice.value === group.value}
          onChoose={() => group.onChoose(choice.value)}
        />
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
      <PopoverContent align="end" className="max-w-none">
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
        <LayoutSwitch layout={props.layout} onLayout={props.onLayout} />
      </div>
      <FilterMenu groups={props.groups} />
    </>
  )
}
