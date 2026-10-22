import { Button } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { runQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { runAppName, runPrice } from "@/pieces/run/run-facts"
import { RunFactsView, runFactsOf } from "@/pieces/run/run-inputs"
import { RunOutputs } from "@/pieces/run/run-outputs"

export function RunCard({ runId }: { runId: string }): ReactElement {
  const run = useQuery(runQuery(runId))
  if (run.data === undefined) {
    return <Skeleton className="h-s12 w-full rounded-card" />
  }
  const found = run.data.run
  const app = findCatalogApp(found.appId)
  return (
    <Card className="gap-s4">
      <div className="flex items-baseline justify-between gap-s2">
        <h3 className="text-body font-medium">{runAppName(found)}</h3>
        <span className="text-caption text-ink-muted">{runPrice(found)}</span>
      </div>
      {app === null ? null : <RunFactsView facts={runFactsOf(app, found)} />}
      <RunOutputs run={found} />
      <Button
        className="self-start"
        render={<Link to="/history/$runId" params={{ runId: found.id }} />}
        nativeButton={false}
      >
        {t("agent.run.open")}
      </Button>
    </Card>
  )
}
