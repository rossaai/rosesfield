import type { AppListing } from "@rosesfield/contract"
import {
  AudioLinesIcon,
  BoxIcon,
  ImageIcon,
  ShapesIcon,
  TypeIcon,
  VideoIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { appName, type OutputKind } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import type { FilterGroup } from "@/pieces/view/view-bar"
import { appIcon } from "@/shell/nav-rows"

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
            label: t(
              category.id === "character"
                ? "kind.all"
                : "history.filter.allApps"
            ),
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

export const kindPictures = {
  all: <ShapesIcon />,
  image: <ImageIcon />,
  video: <VideoIcon />,
  audio: <AudioLinesIcon />,
  text: <TypeIcon />,
  mesh: <BoxIcon />,
} as const satisfies Record<OutputKind | "all", ReactNode>
