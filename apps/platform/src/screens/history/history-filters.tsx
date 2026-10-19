import { IconButton } from "@rosesfield/ui/components/button"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rosesfield/ui/components/sheet"
import { ListFilterIcon } from "lucide-react"
import type { ReactElement } from "react"
import { appName } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"

export type StateChoice = "all" | "working" | "failed"

const allApps = "all"

const stateItems: SegmentedItem<StateChoice>[] = [
  { value: "all", label: t("kind.all") },
  { value: "working", label: t("history.filter.working") },
  { value: "failed", label: t("history.filter.failed") },
]

const appItems = [
  { value: allApps, label: t("history.filter.allApps") },
  ...catalogApps.map((app) => ({ value: app.id, label: appName(app) })),
]

export type HistoryFilterProps = {
  appId: string | null
  state: StateChoice
  onApp: (appId: string | null) => void
  onState: (state: StateChoice) => void
}

export function HistoryFilters(props: HistoryFilterProps): ReactElement {
  return (
    <div className="flex flex-col gap-s3 @regular:flex-row @regular:items-center">
      <Select
        items={appItems}
        value={props.appId ?? allApps}
        onValueChange={(next) =>
          props.onApp(
            next === allApps || typeof next !== "string" ? null : next
          )
        }
      >
        <SelectTrigger
          aria-label={t("history.filter.app")}
          className="@regular:max-w-field-max"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {appItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SegmentedControl
        items={stateItems}
        value={props.state}
        onValueChange={props.onState}
        label={t("history.filter.state")}
      />
    </div>
  )
}

export function PhoneFilters(props: HistoryFilterProps): ReactElement {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <IconButton label={t("history.filters")} tone="quiet">
            <ListFilterIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <SheetContent side="bottom" closeLabel={t("viewer.close")}>
        <SheetHeader>
          <SheetTitle>{t("history.filters")}</SheetTitle>
        </SheetHeader>
        <HistoryFilters {...props} />
      </SheetContent>
    </Sheet>
  )
}
