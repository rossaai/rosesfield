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
import { historyGridItems } from "@/screens/history/history-grid-items"
import { keepsRun } from "@/screens/history/history-screen"
import { ResultGrid } from "@/screens/library/result-grid"
import { WaveformPlayer } from "@/studio/audio/waveform-player"

type AudioCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction: ReactNode
}

function AudioOutputs({ run }: { run: Run }): ReactElement {
  if (run.status !== "done") {
    return <RunOutputs run={run} />
  }
  return (
    <div className="flex w-full flex-col gap-s2">
      {run.outputs.map((assetId) => (
        <WaveformPlayer
          key={assetId}
          assetId={assetId}
          isDemo={run.origin === "demo"}
        />
      ))}
    </div>
  )
}

function AudioRun({
  run,
  onUseInputs,
}: {
  run: Run
  onUseInputs: (run: Run) => void
}): ReactElement {
  return (
    <article className="flex flex-col gap-s2">
      <RunLine run={run} onUseInputs={onUseInputs} />
      <AudioOutputs run={run} />
    </article>
  )
}

function AudioRuns({
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
        <AudioRun run={latest} onUseInputs={onUseInputs} />
      )}
      {earlier.length === 0 ? null : (
        <h2 className="text-body font-medium text-ink-muted">
          {t("app.history.title")}
        </h2>
      )}
      {earlier.map((run) => (
        <AudioRun key={run.id} run={run} onUseInputs={onUseInputs} />
      ))}
    </div>
  )
}

function ViewedRuns({
  runs,
  onUseInputs,
}: {
  runs: readonly Run[]
  onUseInputs: (run: Run) => void
}): ReactElement {
  const view = useCanvasView()
  const kept = runs.filter((run) => keepsRun(run, view.state, undefined))
  if (kept.length === 0) {
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
  if (view.layout === "grid") {
    return <ResultGrid items={historyGridItems(kept)} size={view.size} />
  }
  return <AudioRuns runs={kept} onUseInputs={onUseInputs} />
}

export function AudioCanvas(props: AudioCanvasProps): ReactElement {
  const runs = useAppRuns(props.app)
  if (runs.isPending) {
    return <CanvasSkeleton app={props.app} />
  }
  if (runs.runs.length === 0) {
    return (
      <StateView
        kind={runs.isError ? "failed" : "empty"}
        title={
          runs.isError ? t("history.failed.title") : appEmptyTitle(props.app)
        }
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
  return <ViewedRuns runs={runs.runs} onUseInputs={props.onUseInputs} />
}
