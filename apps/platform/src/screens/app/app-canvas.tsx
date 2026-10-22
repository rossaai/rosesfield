import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useInfiniteQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { runsOf, runsQuery } from "@/api/queries"
import { appEmptyTitle, aspectOf, defaultAspectOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import {
  RunCard,
  RunCardSkeleton,
  RunColumns,
  runHeightOf,
} from "@/pieces/run/run-card"
import { useCanvasView } from "@/screens/app/canvas-view"
import { historyGridItems } from "@/screens/history/history-grid-items"
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

const skeletonPlaces = ["first", "second", "third", "fourth"] as const

export function CanvasSkeleton({ app }: { app: AppListing }): ReactElement {
  const aspect = aspectOf(defaultAspectOf(app))
  const view = useCanvasView()
  return (
    <RunColumns columns={view.columns}>
      {skeletonPlaces.slice(0, Math.max(2, view.columns)).map((place) => (
        <RunCardSkeleton key={place} aspect={aspect} />
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
  if (view.layout === "grid") {
    return (
      <ResultGrid items={historyGridItems(props.runs)} size={view.gridSize} />
    )
  }
  return <RunStack {...props} columns={view.columns} />
}

function RunStack({
  runs,
  columns,
  onUseInputs,
  afterRun,
}: AppCanvasProps & { runs: readonly Run[]; columns: number }): ReactElement {
  const list = runs.flatMap((run) => run.outputs)
  return (
    <RunColumns heights={runs.map(runHeightOf)} columns={columns}>
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
