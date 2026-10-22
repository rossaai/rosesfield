import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import type { ReactElement } from "react"
import type { OutputKind } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import {
  appFilterGroups,
  type DateChoice,
  dateFilterGroup,
  type FilterGroup,
} from "@/screens/library/view-cluster"

export type StateChoice = "all" | "working" | "failed"

const stateItems: SegmentedItem<StateChoice>[] = [
  { value: "all", label: t("kind.all") },
  { value: "working", label: t("history.filter.working") },
  { value: "failed", label: t("history.filter.failed") },
]

export type HistoryFilterProps = {
  appId: string | null
  state: StateChoice
  kind: OutputKind | undefined
  date: DateChoice
  onApp: (appId: string | null) => void
  onState: (state: StateChoice) => void
  onKind: (kind: OutputKind | undefined) => void
  onDate: (date: DateChoice) => void
}

export function historyFilterGroups(props: HistoryFilterProps): FilterGroup[] {
  return [
    ...appFilterGroups(props.appId, props.onApp),
    dateFilterGroup(props.date, props.onDate),
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
