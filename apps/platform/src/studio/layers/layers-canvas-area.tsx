import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { t, tCatalog } from "@/copy/t"
import { RunCard, RunColumns, runHeightOf } from "@/pieces/run/run-card"
import { RunChrome } from "@/pieces/run/run-chrome"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { runHoldsWords } from "@/pieces/view/match-words"
import { NoMatch } from "@/pieces/view/no-match"
import { useAppRuns } from "@/screens/app/app-canvas"
import { runsAwaitingResults, useCanvasView } from "@/screens/app/canvas-view"
import { historyGridItems } from "@/screens/history/history-grid-items"
import { ResultGrid } from "@/screens/library/result-grid"
import { DownloadMenu } from "@/studio/layers/download-menu"
import { type Brush, LayerCanvas } from "@/studio/layers/layer-canvas"
import { LayerList, LayerStrip } from "@/studio/layers/layer-list"
import { canvasRunsOf, type Stack } from "@/studio/layers/layer-stack"
import type { LayersState } from "@/studio/layers/use-layers-screen"

type CanvasAreaProps = {
  state: LayersState
  onAdd: () => void
}

function brushOf(state: LayersState): Brush | null {
  if (state.mode !== "fill" || state.pickedNumber === null) {
    return null
  }
  return {
    canvas: state.brushCanvas,
    size: state.brushSize,
    layerNumber: state.pickedNumber,
    onPaint: state.onPaint,
  }
}

function StackDownload({
  state,
  stack,
}: {
  state: LayersState
  stack: Stack
}): ReactElement {
  return (
    <div className="flex shrink-0 justify-end">
      <DownloadMenu runId={stack.run.id} rows={state.rows} />
    </div>
  )
}

function RegularStack({
  state,
  stack,
}: {
  state: LayersState
  stack: Stack
}): ReactElement {
  return (
    <section className="flex flex-row gap-s3">
      <div className="min-w-0 flex-1">
        <LayerCanvas
          shown={state.shown}
          size={state.size}
          brush={brushOf(state)}
          chrome={
            <RunChrome
              run={stack.run}
              place="over"
              onUseInputs={state.useInputs}
            />
          }
        />
      </div>
      <div className="flex w-field-max shrink-0 flex-col gap-s3">
        <StackDownload state={state} stack={stack} />
        <LayerList
          rows={state.rows}
          actions={state.actions}
          size={state.size}
        />
      </div>
    </section>
  )
}

function PhoneStack({
  state,
  stack,
}: {
  state: LayersState
  stack: Stack
}): ReactElement {
  return (
    <section
      data-slot="layers-phone-stack"
      className="flex h-(--canvas-height) min-h-80 flex-col gap-s3"
    >
      <div
        data-slot="layers-phone-canvas"
        className="flex min-h-0 flex-1 items-center justify-center"
        style={{ containerType: "size" }}
      >
        <LayerCanvas
          shown={state.shown}
          size={state.size}
          brush={brushOf(state)}
          chrome={
            <RunChrome
              run={stack.run}
              place="over"
              onUseInputs={state.useInputs}
            />
          }
          fit="box"
        />
      </div>
      <StackDownload state={state} stack={stack} />
      <div className="shrink-0">
        <LayerStrip
          rows={state.rows}
          actions={state.actions}
          size={state.size}
        />
      </div>
    </section>
  )
}

function StackView({
  state,
  stack,
}: {
  state: LayersState
  stack: Stack
}): ReactElement {
  const isRegular = useIsRegularWindow()
  return isRegular ? (
    <RegularStack state={state} stack={stack} />
  ) : (
    <PhoneStack state={state} stack={stack} />
  )
}

function Empty({ onAdd }: { onAdd: () => void }): ReactElement {
  return (
    <StateView
      kind="empty"
      title={tCatalog("layers.empty.title")}
      body={tCatalog("layers.empty.body")}
      actions={
        <Button onClick={onAdd}>{tCatalog("layers.empty.action")}</Button>
      }
    />
  )
}

function PastRuns({
  runs,
  columns,
  onUseInputs,
}: {
  runs: readonly Run[]
  columns: number
  onUseInputs: (run: Run) => void
}): ReactNode {
  return runs.length === 0 ? null : (
    <RunColumns heights={runs.map(runHeightOf)} columns={columns}>
      {runs.map((run) => (
        <RunCard key={run.id} run={run} onUseInputs={onUseInputs} />
      ))}
    </RunColumns>
  )
}

type PastView = { above: readonly Run[]; below: ReactNode }

function usePastView(
  latest: Run | null,
  earlier: readonly Run[],
  onUseInputs: (run: Run) => void
): PastView {
  const view = useCanvasView()
  const past = latest === null ? earlier : [latest, ...earlier]
  const kept = past.filter((run) => runHoldsWords(run, view.words.trim()))
  if (past.length > 0 && kept.length === 0) {
    return {
      above: [],
      below: <NoMatch onShowAll={() => view.setWords("")} />,
    }
  }
  if (view.layout === "grid") {
    return {
      above: runsAwaitingResults(kept),
      below: <ResultGrid items={historyGridItems(kept)} size={view.size} />,
    }
  }
  return {
    above: kept.filter((run) => run.id === latest?.id),
    below: (
      <PastRuns
        runs={kept.filter((run) => run.id !== latest?.id)}
        columns={view.columns}
        onUseInputs={onUseInputs}
      />
    ),
  }
}

export function LayersCanvasArea({
  state,
  onAdd,
}: CanvasAreaProps): ReactElement {
  const runs = useAppRuns(state.app)
  const { stack } = state
  const { latest, earlier } = canvasRunsOf(runs.runs, stack?.run.id ?? null)
  const past = usePastView(latest, earlier, state.useInputs)
  const view = useCanvasView()
  if (runs.isPending) {
    return <Skeleton className="aspect-square w-full max-w-field-max" />
  }
  if (runs.isError && runs.runs.length === 0) {
    return (
      <StateView
        kind="failed"
        title={t("history.failed.title")}
        body={t("app.empty.body")}
        actions={<Button onClick={runs.refetch}>{t("state.tryAgain")}</Button>}
      />
    )
  }
  if (stack === null && latest === null) {
    return <Empty onAdd={onAdd} />
  }
  return (
    <div data-slot="layers-canvas-area" className="flex flex-col gap-s6">
      <PastRuns
        runs={past.above}
        columns={view.columns}
        onUseInputs={state.useInputs}
      />
      {stack === null ? null : <StackView state={state} stack={stack} />}
      {past.below}
    </div>
  )
}
