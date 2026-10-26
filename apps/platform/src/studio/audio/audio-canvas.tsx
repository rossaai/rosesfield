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
import { RunsInView } from "@/screens/app/canvas-view"
import { WaveformPlayer } from "@/studio/audio/waveform-player"
import { useViewer } from "@/viewer/viewer-context"

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
  const viewer = useViewer()
  if (run.status !== "done") {
    return <RunOutputs run={run} chrome={chrome} />
  }
  return (
    <RunFrame chrome={chrome} place="under">
      <div className="flex w-full flex-col gap-s2">
        {run.outputs.map((assetId) => (
          <WaveformPlayer
            key={assetId}
            assetId={assetId}
            onOpen={(origin) => viewer.open(assetId, origin, run.outputs)}
          />
        ))}
      </div>
    </RunFrame>
  )
}

function AudioRuns({
  runs,
  columns,
  onUseInputs,
}: {
  runs: readonly Run[]
  columns: number
  onUseInputs: (run: Run) => void
}): ReactElement {
  return (
    <RunColumns columns={columns}>
      {runs.map((run) => (
        <RunCard key={run.id} run={run} onUseInputs={onUseInputs}>
          {(chrome) => <AudioOutputs run={run} chrome={chrome} />}
        </RunCard>
      ))}
    </RunColumns>
  )
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
  return (
    <RunsInView
      runs={runs.runs}
      cards={(shown, columns) => (
        <AudioRuns
          runs={shown}
          columns={columns}
          onUseInputs={props.onUseInputs}
        />
      )}
    />
  )
}
