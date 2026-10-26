import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { appEmptyTitle } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { RunCard } from "@/pieces/run/run-card"
import {
  type RunChromeOf,
  RunFrame,
  RunOutputs,
} from "@/pieces/run/run-outputs"
import { CanvasSkeleton, useAppRuns } from "@/screens/app/app-canvas"
import {
  gridSplitOf,
  MatchedRuns,
  useCanvasView,
} from "@/screens/app/canvas-view"
import { historyGridItems } from "@/screens/history/history-grid-items"
import { ResultGrid } from "@/screens/library/result-grid"
import { MeshOnAsk, MeshOutput } from "@/studio/three-d/mesh-viewer"

type ThreeDCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction?: ReactNode
  opened?: string | undefined
}

function isShownOpen(
  assetId: string,
  isLatest: boolean,
  opened: string | undefined
): boolean {
  return opened === undefined ? isLatest : assetId === opened
}

function holdsOpened(runs: readonly Run[], opened: string): boolean {
  return runs.some(
    (one) =>
      one.status === "done" && one.outputs.some((output) => output === opened)
  )
}

function MeshOutputs({
  run,
  isLatest,
  opened,
  chrome,
}: {
  run: Run
  isLatest: boolean
  opened: string | undefined
  chrome: RunChromeOf
}): ReactElement {
  if (run.status !== "done") {
    return <RunOutputs run={run} chrome={chrome} />
  }
  return (
    <RunFrame chrome={chrome} place="under">
      <div className="flex w-full flex-col gap-s2">
        {run.outputs.map((assetId) =>
          isShownOpen(assetId, isLatest, opened) ? (
            <MeshOutput key={assetId} assetId={assetId} />
          ) : (
            <MeshOnAsk key={assetId} assetId={assetId} />
          )
        )}
      </div>
    </RunFrame>
  )
}

function RunBlock({
  run,
  isLatest,
  opened,
  onUseInputs,
}: {
  run: Run
  isLatest: boolean
  opened: string | undefined
  onUseInputs: (run: Run) => void
}): ReactElement {
  return (
    <RunCard run={run} onUseInputs={onUseInputs}>
      {(chrome) => (
        <MeshOutputs
          run={run}
          isLatest={isLatest}
          opened={opened}
          chrome={chrome}
        />
      )}
    </RunCard>
  )
}

export function RunStack({
  runs,
  opened,
  onUseInputs,
}: {
  runs: readonly Run[]
  opened?: string | undefined
  onUseInputs: (run: Run) => void
}): ReactElement {
  const [latest, ...earlier] = runs
  return (
    <div className="flex flex-col gap-s6">
      {opened === undefined || holdsOpened(runs, opened) ? null : (
        <MeshOutput assetId={opened} />
      )}
      {latest === undefined ? null : (
        <RunBlock
          run={latest}
          isLatest
          opened={opened}
          onUseInputs={onUseInputs}
        />
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
          opened={opened}
          onUseInputs={onUseInputs}
        />
      ))}
    </div>
  )
}

function ThreeDGrid({
  runs,
  size,
  onUseInputs,
}: {
  runs: readonly Run[]
  size: number
  onUseInputs: (run: Run) => void
}): ReactElement {
  const split = gridSplitOf(runs)
  return (
    <div data-slot="app-grid" className="flex flex-col gap-s2">
      {split.cards.length === 0 ? null : (
        <RunStack runs={split.cards} onUseInputs={onUseInputs} />
      )}
      <ResultGrid items={historyGridItems(split.results)} size={size} />
    </div>
  )
}

export function ThreeDCanvas(props: ThreeDCanvasProps): ReactElement {
  const { app, opened } = props
  const runs = useAppRuns(app)
  const view = useCanvasView()
  if (runs.isPending) {
    return <CanvasSkeleton app={app} />
  }
  if (opened !== undefined) {
    return (
      <RunStack
        runs={runs.runs}
        opened={opened}
        onUseInputs={props.onUseInputs}
      />
    )
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
  return (
    <MatchedRuns runs={runs.runs}>
      {(kept) =>
        view.layout === "grid" ? (
          <ThreeDGrid
            runs={kept}
            size={view.size}
            onUseInputs={props.onUseInputs}
          />
        ) : (
          <RunStack runs={kept} onUseInputs={props.onUseInputs} />
        )
      }
    </MatchedRuns>
  )
}
