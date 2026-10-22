import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement } from "react"
import { t, tCatalog } from "@/copy/t"
import { RunCard, RunColumns } from "@/pieces/run/run-card"
import { RunLine } from "@/pieces/run/run-line"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { useAppRuns } from "@/screens/app/app-canvas"
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

function StackHead({
  state,
  stack,
}: {
  state: LayersState
  stack: Stack
}): ReactElement {
  return (
    <div className="flex min-w-0 flex-col gap-s2 @regular:flex-row @regular:items-start">
      <div className="min-w-0 flex-1">
        <RunLine run={stack.run} onUseInputs={state.useInputs} />
      </div>
      <div className="shrink-0">
        <DownloadMenu runId={stack.run.id} rows={state.rows} />
      </div>
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
    <section className="flex flex-col gap-s3">
      <StackHead state={state} stack={stack} />
      <div className="flex flex-row gap-s3">
        <div className="min-w-0 flex-1">
          <LayerCanvas
            shown={state.shown}
            size={state.size}
            brush={brushOf(state)}
            isDemo={stack.run.origin === "demo"}
          />
        </div>
        <div className="w-field-max shrink-0">
          <LayerList
            rows={state.rows}
            actions={state.actions}
            size={state.size}
          />
        </div>
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
      <StackHead state={state} stack={stack} />
      <div
        data-slot="layers-phone-canvas"
        className="flex min-h-0 flex-1 items-center justify-center"
        style={{ containerType: "size" }}
      >
        <LayerCanvas
          shown={state.shown}
          size={state.size}
          brush={brushOf(state)}
          isDemo={stack.run.origin === "demo"}
          fit="box"
        />
      </div>
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

export function LayersCanvasArea({
  state,
  onAdd,
}: CanvasAreaProps): ReactElement {
  const runs = useAppRuns(state.app)
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
  const { stack } = state
  const { latest, earlier } = canvasRunsOf(runs.runs, stack?.run.id ?? null)
  if (stack === null && latest === null) {
    return <Empty onAdd={onAdd} />
  }
  return (
    <div className="flex flex-col gap-s6">
      {latest === null ? null : (
        <RunColumns>
          <RunCard run={latest} onUseInputs={state.useInputs} />
        </RunColumns>
      )}
      {stack === null ? null : <StackView state={state} stack={stack} />}
      {earlier.length === 0 ? null : (
        <RunColumns>
          {earlier.map((run) => (
            <RunCard key={run.id} run={run} onUseInputs={state.useInputs} />
          ))}
        </RunColumns>
      )}
    </div>
  )
}
