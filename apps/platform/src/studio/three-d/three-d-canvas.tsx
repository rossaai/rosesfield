import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { appEmptyTitle } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { RunLine } from "@/pieces/run/run-line"
import { RunOutputs } from "@/pieces/run/run-outputs"
import { CanvasSkeleton, useAppRuns } from "@/screens/app/app-canvas"
import { useCanvasView } from "@/screens/app/canvas-view"
import { keepsRun } from "@/screens/history/history-screen"
import { MeshOnAsk, MeshOutput } from "@/studio/three-d/mesh-viewer"

type ThreeDCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction?: ReactNode
}

function RunBlock({
  run,
  isLatest,
  onUseInputs,
}: {
  run: Run
  isLatest: boolean
  onUseInputs: (run: Run) => void
}): ReactElement {
  return (
    <article className="flex flex-col gap-s2">
      <RunLine run={run} onUseInputs={onUseInputs} />
      {run.status === "done" ? (
        run.outputs.map((assetId) =>
          isLatest ? (
            <MeshOutput key={assetId} assetId={assetId} />
          ) : (
            <MeshOnAsk key={assetId} assetId={assetId} />
          )
        )
      ) : (
        <RunOutputs run={run} />
      )}
    </article>
  )
}

export function RunStack({
  runs,
  onUseInputs,
}: {
  runs: readonly Run[]
  onUseInputs: (run: Run) => void
}): ReactElement {
  const [latest, ...earlier] = runs
  return (
    <div className="flex flex-col gap-s6">
      {latest === undefined ? null : (
        <RunBlock run={latest} isLatest onUseInputs={onUseInputs} />
      )}
      {earlier.length === 0 ? null : (
        <h2 className="text-body font-medium text-ink-muted">
          {t("app.history.title")}
        </h2>
      )}
      {earlier.map((run) => (
        <RunBlock
          key={run.id}
          run={run}
          isLatest={false}
          onUseInputs={onUseInputs}
        />
      ))}
    </div>
  )
}

export function ThreeDCanvas(props: ThreeDCanvasProps): ReactElement {
  const { app } = props
  const runs = useAppRuns(app)
  const view = useCanvasView()
  if (runs.isPending) {
    return <CanvasSkeleton app={app} />
  }
  if (runs.runs.length === 0) {
    return (
      <StateView
        kind={runs.isError ? "failed" : "empty"}
        title={runs.isError ? t("history.failed.title") : appEmptyTitle(app)}
        body={t("app.empty.body")}
        actions={
          runs.isError ? (
            <Button onClick={runs.refetch}>{t("state.tryAgain")}</Button>
          ) : (
            props.emptyAction
          )
        }
      />
    )
  }
  const shown = runs.runs.filter((run) => keepsRun(run, view.state, undefined))
  if (shown.length === 0) {
    return (
      <StateView
        kind="empty"
        title={t("history.filterEmpty.title")}
        actions={
          <Button onClick={view.clear}>
            {t("history.filterEmpty.action")}
          </Button>
        }
      />
    )
  }
  return <RunStack runs={shown} onUseInputs={props.onUseInputs} />
}
