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
import { RunLine } from "@/pieces/run/run-line"
import { RunOutputs } from "@/pieces/run/run-outputs"

type AppCanvasProps = {
  app: AppListing
  order: "newest-first" | "newest-last"
  onUseInputs: (run: Run) => void
  emptyAction?: ReactNode
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

function RunBlock({
  run,
  list,
  onUseInputs,
}: {
  run: Run
  list: readonly string[]
  onUseInputs: (run: Run) => void
}): ReactElement {
  return (
    <article className="flex flex-col gap-s2">
      <RunLine run={run} onUseInputs={onUseInputs} />
      <RunOutputs run={run} list={list} />
    </article>
  )
}

export function CanvasSkeleton({ app }: { app: AppListing }): ReactElement {
  const aspect = aspectOf(defaultAspectOf(app))
  return (
    <div className="flex flex-col gap-s4">
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-s2">
          <Skeleton className="h-s5 w-1/2" />
          <Skeleton className="w-1/2" style={aspectStyle(aspect)} />
        </div>
      ))}
    </div>
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
  return <RunStack {...props} runs={runs.runs} />
}

function RunStack({
  runs,
  order,
  onUseInputs,
}: AppCanvasProps & { runs: readonly Run[] }): ReactElement {
  const list = runs.flatMap((run) => run.outputs)
  if (order === "newest-last") {
    return (
      <div className="flex flex-col gap-s6">
        {[...runs].reverse().map((run) => (
          <RunBlock
            key={run.id}
            run={run}
            list={list}
            onUseInputs={onUseInputs}
          />
        ))}
      </div>
    )
  }
  const [latest, ...earlier] = runs
  return (
    <div className="flex flex-col gap-s6">
      {latest === undefined ? null : (
        <RunBlock run={latest} list={list} onUseInputs={onUseInputs} />
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
          list={list}
          onUseInputs={onUseInputs}
        />
      ))}
    </div>
  )
}
