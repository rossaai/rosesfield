import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import {
  ViewMenu as KernelViewMenu,
  type ViewFacet,
} from "@rosesfield/ui/components/view-menu"
import {
  AudioLinesIcon,
  ImageIcon,
  LayoutGridIcon,
  ShapesIcon,
  TypeIcon,
  VideoIcon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { appName, type OutputKind } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { appIcon } from "@/shell/nav-rows"

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

type AppCategory = AppListing["category"]

const every = ""

const appCategories: ReadonlyArray<{ id: AppCategory; name: CopyKey }> = [
  { id: "image", name: "shell.area.image" },
  { id: "video", name: "shell.area.video" },
  { id: "audio", name: "shell.area.audio" },
  { id: "character", name: "shell.nav.characters" },
]

export function appFilterGroups(
  appId: string | null,
  onApp: (appId: string | null) => void,
  apps: readonly AppListing[] = catalogApps
): FilterGroup[] {
  return appCategories.flatMap((category) => {
    const inCategory = apps.filter((app) => app.category === category.id)
    if (inCategory.length === 0) {
      return []
    }
    const chosen = inCategory.find((app) => app.id === appId)
    return [
      {
        id: `app-${category.id}`,
        name: t(category.name),
        icon: null,
        choices: [
          {
            value: every,
            label: t("history.filter.allApps"),
            picture: <ShapesIcon />,
          },
          ...inCategory.map((app) => ({
            value: app.id,
            label: appName(app),
            picture: appIcon(app),
          })),
        ],
        value: chosen?.id ?? every,
        onChoose: (value: string) => onApp(value === every ? null : value),
      },
    ]
  })
}

export type DateChoice = "any" | "today" | "week" | "month"

const dateChoices: readonly DateChoice[] = ["any", "today", "week", "month"]

const dateKeys = {
  any: "library.date.any",
  today: "library.day.today",
  week: "library.date.week",
  month: "library.date.month",
} as const satisfies Record<DateChoice, CopyKey>

const dayMs = 24 * 60 * 60 * 1000

const dateSpans = {
  any: Number.POSITIVE_INFINITY,
  today: 0,
  week: 7 * dayMs,
  month: 30 * dayMs,
} satisfies Record<DateChoice, number>

function startOfDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

export function isWithinDate(
  iso: string,
  date: DateChoice,
  now: Date
): boolean {
  if (date === "any") {
    return true
  }
  const made = Date.parse(iso)
  return date === "today"
    ? made >= startOfDay(now)
    : made >= now.getTime() - dateSpans[date]
}

function isDateChoice(value: string): value is DateChoice {
  return dateChoices.some((choice) => choice === value)
}

export function dateFilterGroup(
  date: DateChoice,
  onDate: (date: DateChoice) => void
): FilterGroup {
  return {
    id: "date",
    name: t("library.filter.date"),
    icon: null,
    choices: dateChoices.map((choice) => ({
      value: choice,
      label: t(dateKeys[choice]),
      picture: null,
    })),
    value: date,
    onChoose: (value) => {
      if (isDateChoice(value)) {
        onDate(value)
      }
    },
  }
}

export const tileSizes = {
  min: 0,
  max: 2,
  initial: 1,
} as const

export const kindPictures = {
  all: <ShapesIcon />,
  image: <ImageIcon />,
  video: <VideoIcon />,
  audio: <AudioLinesIcon />,
  text: <TypeIcon />,
} as const satisfies Record<OutputKind | "all", ReactNode>

function facetOf(group: FilterGroup): ViewFacet {
  return {
    id: group.id,
    label: group.name,
    value: group.value,
    options: group.choices.map((choice) => ({
      value: choice.value,
      label: choice.label,
      ...(choice.picture === null ? {} : { lead: choice.picture }),
    })),
    onValueChange: group.onChoose,
  }
}

export type ViewClusterProps = {
  layout: ViewLayout
  onLayout: (layout: ViewLayout) => void
  size: number
  onSize: (size: number) => void
  groups: readonly FilterGroup[]
  hasSize?: boolean
  isLoading?: boolean
}

function LoadingView(): ReactElement {
  return (
    <Button data-slot="view-menu" tone="quiet" size="dense" disabled={true}>
      <LayoutGridIcon aria-hidden="true" />
      {t("app.canvas.view")}
    </Button>
  )
}

export function ViewMenu(props: ViewClusterProps): ReactElement {
  if (props.isLoading === true) {
    return <LoadingView />
  }
  const hasSize = props.hasSize ?? props.layout === "grid"
  return (
    <KernelViewMenu
      label={t("app.canvas.view")}
      layoutLabel={t("library.view.label")}
      listLabel={t("library.view.list")}
      gridLabel={t("library.view.grid")}
      layout={props.layout}
      onLayoutChange={props.onLayout}
      {...(hasSize
        ? {
            size: {
              label: t("library.view.size"),
              value: props.size,
              min: tileSizes.min,
              max: tileSizes.max,
              onValueChange: props.onSize,
            },
          }
        : {})}
      filterLabel={t("library.filter")}
      facets={props.groups.map(facetOf)}
    />
  )
}

export const ViewCluster = ViewMenu
