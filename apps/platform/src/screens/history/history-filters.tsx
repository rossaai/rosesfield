import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { LayoutGridIcon, ShapesIcon } from "lucide-react"
import type { ReactElement } from "react"
import { appName, type OutputKind, outputKinds } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import {
  type FilterChoice,
  type FilterGroup,
  kindPictures,
} from "@/screens/library/view-cluster"
import { appIcon } from "@/shell/nav-rows"

export type StateChoice = "all" | "working" | "failed"

const every = "all"

const stateItems: SegmentedItem<StateChoice>[] = [
  { value: "all", label: t("kind.all") },
  { value: "working", label: t("history.filter.working") },
  { value: "failed", label: t("history.filter.failed") },
]

const appChoices: readonly FilterChoice[] = [
  {
    value: every,
    label: t("history.filter.allApps"),
    picture: <LayoutGridIcon />,
  },
  ...catalogApps.map((app) => ({
    value: app.id,
    label: appName(app),
    picture: appIcon(app),
  })),
]

const kindChoices: readonly FilterChoice[] = [
  { value: every, label: t("kind.all"), picture: kindPictures.all },
  ...outputKinds.map((kind) => ({
    value: kind,
    label: t(`kind.${kind}`),
    picture: kindPictures[kind],
  })),
]

export type HistoryFilterProps = {
  appId: string | null
  state: StateChoice
  kind: OutputKind | undefined
  onApp: (appId: string | null) => void
  onState: (state: StateChoice) => void
  onKind: (kind: OutputKind | undefined) => void
}

function kindOf(value: string): OutputKind | undefined {
  return outputKinds.find((kind) => kind === value)
}

export function historyFilterGroups(props: HistoryFilterProps): FilterGroup[] {
  return [
    {
      id: "app",
      name: t("history.filter.app"),
      icon: <LayoutGridIcon />,
      choices: appChoices,
      value: props.appId ?? every,
      onChoose: (value) => props.onApp(value === every ? null : value),
    },
    {
      id: "kind",
      name: t("library.kind.label"),
      icon: <ShapesIcon />,
      choices: kindChoices,
      value: props.kind ?? every,
      onChoose: (value) => props.onKind(kindOf(value)),
    },
  ]
}

export function StateTabs(props: HistoryFilterProps): ReactElement {
  return (
    <SegmentedControl
      items={stateItems}
      value={props.state}
      onValueChange={props.onState}
      label={t("history.filter.state")}
      density="row"
    />
  )
}
