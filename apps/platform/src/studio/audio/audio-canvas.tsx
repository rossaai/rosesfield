import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { appEmptyTitle } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { RunCard, RunColumns } from "@/pieces/run/run-card"
import {
  type RunChromeOf,
  RunFrame,
  RunOutputs,
} from "@/pieces/run/run-outputs"
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

function AudioOutputs({
  run,
  chrome,
}: {
  run: Run
  chrome: RunChromeOf
}): ReactElement {
  if (run.status !== "done") {
    return <RunOutputs run={run} chrome={chrome} />
  }
  return (
    <RunFrame chrome={chrome} place="under">
      <div className="flex w-full flex-col gap-s2">
        {run.outputs.map((assetId) => (
          <WaveformPlayer key={assetId} assetId={assetId} />
        ))}
      </div>
    </RunFrame>
  )
}

function AudioRuns({
  runs,
  onUseInputs,
}: {
  runs: readonly Run[]
  onUseInputs: (run: Run) => void
}): ReactElement {
  return (
    <RunColumns>
      {runs.map((run) => (
        <RunCard key={run.id} run={run} onUseInputs={onUseInputs}>
          {(chrome) => <AudioOutputs run={run} chrome={chrome} />}
        </RunCard>
      ))}
    </RunColumns>
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
