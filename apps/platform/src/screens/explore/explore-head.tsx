import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import type { PlaceView } from "@/pieces/view/use-view"
import { ViewBar, viewRowClassOf } from "@/pieces/view/view-bar"
import { AppsHeader, AppsRow, Reveal } from "@/screens/explore/explore-sections"

export function ExploreTop({
  view,
  apps,
  cardWidth,
}: {
  view: PlaceView
  apps: readonly AppListing[]
  cardWidth: number
}): ReactElement {
  const isRegular = useIsRegularWindow()
  const hasApps = apps.length > 0
  return (
    <Reveal>
      <div
        data-slot="explore-head"
        className={cn(viewRowClassOf(isRegular), hasApps ? "mb-s6" : "")}
      >
        <div className="w-full min-w-0 flex-1">
          {hasApps ? <AppsHeader /> : null}
        </div>
        <ViewBar
          view={view}
          hasLayout={false}
          searchLabel={t("explore.search.label")}
        />
      </div>
      {hasApps ? <AppsRow apps={apps} cardWidth={cardWidth} /> : null}
    </Reveal>
  )
}

export function ExploreNoMatch({ view }: { view: PlaceView }): ReactElement {
  return (
    <StateView
      kind="empty"
      title={t("library.filterEmpty.title")}
      actions={
        <Button onClick={() => view.setWords("")}>
          {t("library.filterEmpty.action")}
        </Button>
      }
    />
  )
}
