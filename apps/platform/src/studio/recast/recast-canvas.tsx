import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { appEmptyTitle, aspectOf, defaultAspectOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { aspectStyle } from "@/pieces/asset-tile"
import { RunLine } from "@/pieces/run/run-line"
import { RunOutputs } from "@/pieces/run/run-outputs"
import { useAppRuns } from "@/screens/app/app-canvas"
import { ComparePair } from "@/studio/recast/compare-pair"

type RecastCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction: ReactNode
}

function RecastRun({
  run,
  onUseInputs,
}: {
  run: Run
  onUseInputs: (run: Run) => void
}): ReactElement {
  const [outputId] = run.outputs
  return (
    <article className="flex flex-col gap-s2">
      <RunLine run={run} onUseInputs={onUseInputs} />
      {run.status === "done" && outputId !== undefined ? (
        <ComparePair run={run} outputId={outputId} />
      ) : (
        <RunOutputs run={run} />
      )}
    </article>
  )
}

function CanvasSkeleton({ app }: { app: AppListing }): ReactElement {
  const aspect = aspectOf(defaultAspectOf(app))
  return (
    <div className="flex flex-col gap-s2">
      <Skeleton className="h-s5 w-1/2" />
      <div className="grid grid-cols-2 gap-s2">
        <Skeleton className="w-full" style={aspectStyle(aspect)} />
        <Skeleton className="w-full" style={aspectStyle(aspect)} />
      </div>
    </div>
  )
}

export function RecastCanvas({
  app,
  onUseInputs,
  emptyAction,
}: RecastCanvasProps): ReactElement {
  const runs = useAppRuns(app)
  if (runs.isPending) {
    return <CanvasSkeleton app={app} />
  }
  const [latest, ...earlier] = runs.runs
  if (latest === undefined) {
    return (
      <StateView
        kind={runs.isError ? "failed" : "empty"}
        title={runs.isError ? t("history.failed.title") : appEmptyTitle(app)}
        body={t("app.empty.body")}
        actions={
          runs.isError ? (
            <Button onClick={runs.refetch}>{t("state.tryAgain")}</Button>
          ) : (
            emptyAction
          )
        }
      />
    )
  }
  return (
    <div className="flex flex-col gap-s6">
      <RecastRun run={latest} onUseInputs={onUseInputs} />
      {earlier.length === 0 ? null : (
        <h2 className="text-body font-medium text-ink-muted">
          {t("app.history.title")}
        </h2>
      )}
      {earlier.map((run) => (
        <RecastRun key={run.id} run={run} onUseInputs={onUseInputs} />
      ))}
    </div>
  )
}
