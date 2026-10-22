import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useInfiniteQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { runsOf, runsQuery } from "@/api/queries"
import { appEmptyTitle, aspectOf, defaultAspectOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { aspectStyle } from "@/pieces/asset-tile"
import { RunCard, RunColumns } from "@/pieces/run/run-card"
import { useCanvasView } from "@/screens/app/canvas-view"
import { historyGridItems } from "@/screens/history/history-grid-items"
import { keepsRun } from "@/screens/history/history-screen"
import { ResultGrid } from "@/screens/library/result-grid"

type AppCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction?: ReactNode
  afterRun?: (run: Run) => ReactNode
}

type AppRuns = {
  runs: Run[]
  isPending: boolean
  isError: boolean
  refetch: () => void
}

export function useAppRuns(app: AppListing): AppRuns {
  const query = useInfiniteQuery(runsQuery(app.id))
  return {
    runs: runsOf(query.data),
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  }
}

export function CanvasSkeleton({ app }: { app: AppListing }): ReactElement {
  const aspect = aspectOf(defaultAspectOf(app))
  return (
    <RunColumns>
      {[0, 1].map((tile) => (
        <Skeleton key={tile} className="w-full" style={aspectStyle(aspect)} />
      ))}
    </RunColumns>
  )
}

export function AppCanvas(props: AppCanvasProps): ReactElement {
  const { app } = props
  const runs = useAppRuns(app)
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
  return <ViewedRuns {...props} runs={runs.runs} />
}

function ViewedRuns(
  props: AppCanvasProps & { runs: readonly Run[] }
): ReactElement {
  const view = useCanvasView()
  const runs = props.runs.filter((run) => keepsRun(run, view.state, undefined))
  if (runs.length === 0) {
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
    return <ResultGrid items={historyGridItems(runs)} size={view.size} />
  }
  return <RunStack {...props} runs={runs} />
}

function RunStack({
  runs,
  onUseInputs,
  afterRun,
}: AppCanvasProps & { runs: readonly Run[] }): ReactElement {
  const list = runs.flatMap((run) => run.outputs)
  return (
    <RunColumns>
      {runs.map((run) => (
        <RunCard
          key={run.id}
          run={run}
          list={list}
          onUseInputs={onUseInputs}
          afterRun={afterRun}
        />
      ))}
    </RunColumns>
  )
}
