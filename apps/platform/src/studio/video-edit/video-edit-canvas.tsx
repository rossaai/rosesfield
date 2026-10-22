import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { type ReactElement, type ReactNode, useState } from "react"
import { appEmptyTitle, aspectOf, defaultAspectOf } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { aspectStyle } from "@/pieces/asset-tile"
import { RunCard, RunColumns } from "@/pieces/run/run-card"
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
    <RunCard run={run} onUseInputs={onUseInputs}>
      {(chrome) => (
        <>
          {canCompare && isComparing ? (
            <CompareDivider run={run} outputId={outputId} />
          ) : (
            <RunOutputs run={run} list={list} chrome={chrome} />
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
        </>
      )}
    </RunCard>
  )
}

function CanvasSkeleton({ app }: { app: AppListing }): ReactElement {
  const aspect = aspectOf(defaultAspectOf(app))
  return (
    <RunColumns>
      {[0, 1].map((tile) => (
        <Skeleton key={tile} className="w-full" style={aspectStyle(aspect)} />
      ))}
    </RunColumns>
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
    <RunColumns>
      {[latest, ...earlier].map((run) => (
        <EditedRun
          key={run.id}
          run={run}
          list={list}
          onUseInputs={onUseInputs}
        />
      ))}
    </RunColumns>
  )
}
