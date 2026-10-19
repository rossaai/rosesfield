import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { type ReactElement, type ReactNode, useState } from "react"
import { appEmptyTitle, aspectOf, defaultAspectOf } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { aspectStyle } from "@/pieces/asset-tile"
import { RunLine } from "@/pieces/run/run-line"
import { RunOutputs } from "@/pieces/run/run-outputs"
import { useAppRuns } from "@/screens/app/app-canvas"
import { CompareDivider } from "@/studio/video-edit/compare-divider"

type VideoEditCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction: ReactNode
}

function EditedRun({
  run,
  list,
  onUseInputs,
}: {
  run: Run
  list: readonly string[]
  onUseInputs: (run: Run) => void
}): ReactElement {
  const [isComparing, setComparing] = useState(false)
  const [outputId] = run.outputs
  const canCompare = run.status === "done" && outputId !== undefined
  return (
    <article className="flex flex-col gap-s2">
      <RunLine run={run} onUseInputs={onUseInputs} />
      {canCompare && isComparing ? (
        <CompareDivider run={run} outputId={outputId} />
      ) : (
        <RunOutputs run={run} list={list} />
      )}
      {canCompare ? (
        <div>
          <Button size="small" onClick={() => setComparing(!isComparing)}>
            {isComparing
              ? tCatalog("videoEdit.compare.close")
              : tCatalog("videoEdit.compare.open")}
          </Button>
        </div>
      ) : null}
    </article>
  )
}

function CanvasSkeleton({ app }: { app: AppListing }): ReactElement {
  const aspect = aspectOf(defaultAspectOf(app))
  return (
    <div className="flex flex-col gap-s4">
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-s2">
          <Skeleton className="h-s5 w-1/2" />
          <Skeleton className="w-1/2" style={aspectStyle(aspect)} />
        </div>
      ))}
    </div>
  )
}

export function VideoEditCanvas({
  app,
  onUseInputs,
  emptyAction,
}: VideoEditCanvasProps): ReactElement {
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
  const list = runs.runs.flatMap((run) => run.outputs)
  return (
    <div className="flex flex-col gap-s6">
      <EditedRun run={latest} list={list} onUseInputs={onUseInputs} />
      {earlier.length === 0 ? null : (
        <h2 className="text-body font-medium text-ink-muted">
          {t("app.history.title")}
        </h2>
      )}
      {earlier.map((run) => (
        <EditedRun
          key={run.id}
          run={run}
          list={list}
          onUseInputs={onUseInputs}
        />
      ))}
    </div>
  )
}
