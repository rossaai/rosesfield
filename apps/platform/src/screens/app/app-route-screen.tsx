import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Link, useParams, useSearch } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { ScreenState } from "@/pieces/screen-state"
import { AskedTab } from "@/screens/app/app-stage"
import { BarAppScreen } from "@/screens/app/bar-app-screen"
import { ColumnAppScreen } from "@/screens/app/column-app-screen"
import { studioScreenFor } from "@/screens/app/studio-screens"
import { StudioSuspense } from "@/screens/app/studio-suspense"
import type { AppSeeds } from "@/screens/app/use-app-screen"
import { ScreenHeader } from "@/shell/screen-header"

function MissingApp({ appId }: { appId: string }): ReactElement {
  return (
    <>
      <ScreenHeader title={t("apps.title")} />
      <ScreenState
        kind="empty"
        title={t("app.notFound.title", { id: appId })}
        actions={
          <Button
            tone="primary"
            render={<Link to="/apps" />}
            nativeButton={false}
          >
            {t("app.notFound.action")}
          </Button>
        }
      />
    </>
  )
}

function AppScreenFor({
  app,
  seeds,
}: {
  app: AppListing
  seeds: AppSeeds
}): ReactElement {
  const Studio = studioScreenFor(app.id)
  if (Studio === null) {
    return app.layout === "bar" ? (
      <BarAppScreen app={app} chips={[]} seeds={seeds} />
    ) : (
      <ColumnAppScreen app={app} seeds={seeds} />
    )
  }
  return (
    <StudioSuspense>
      <Studio app={app} seeds={seeds} />
    </StudioSuspense>
  )
}

export function AppRouteScreen(): ReactElement {
  const { appId } = useParams({ from: "/_shell/apps/$appId" })
  const search = useSearch({ from: "/_shell/apps/$appId" })
  const app = findCatalogApp(appId)
  if (app === null) {
    return <MissingApp appId={appId} />
  }
  return (
    <AskedTab tab={search.tab ?? null}>
      <AppScreenFor
        key={`${app.id}:${search.from ?? ""}:${search.use ?? ""}:${search.share ?? ""}:${search.tab ?? ""}:${search.mode ?? ""}:${search.open ?? ""}:${search.example ?? ""}`}
        app={app}
        seeds={{
          use: search.use,
          from: search.from,
          share: search.share,
          mode: search.mode,
          open: search.open,
          example: search.example,
        }}
      />
    </AskedTab>
  )
}
