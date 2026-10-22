import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { runQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { RunCard as RunMedia } from "@/pieces/run/run-card"

export function RunCard({ runId }: { runId: string }): ReactElement {
  const run = useQuery(runQuery(runId))
  if (run.data === undefined) {
    return <Skeleton className="h-s12 w-full rounded-card" />
  }
  const found = run.data.run
  return (
    <div data-slot="agent-run" className="w-full max-w-prose-max">
      <RunMedia
        run={found}
        afterRun={() => (
          <Button
            size="small"
            tone="quiet"
            className="self-start"
            render={<Link to="/history/$runId" params={{ runId: found.id }} />}
            nativeButton={false}
          >
            {t("agent.run.open")}
          </Button>
        )}
      />
    </div>
  )
}
