import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"
import { appEmptyTitle } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { OutputRow } from "@/pieces/run/output-row"
import { runAspect } from "@/pieces/run/run-facts"
import { RunLine } from "@/pieces/run/run-line"
import { RunOutputs } from "@/pieces/run/run-outputs"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  keyOf,
  type View,
  viewsOf,
} from "../../../../../packages/catalog/src/angles/angle-views"

type AnglesCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction: ReactNode
}

export function viewCaption(view: View): string {
  const lower = (key: string): string => tCatalog(key).toLocaleLowerCase("en")
  return tCatalog("angles.view.caption", {
    side: tCatalog(`angles.choice.side.${keyOf(view.side)}`),
    height: lower(`angles.choice.height.${keyOf(view.height)}`),
    distance: lower(`angles.choice.distance.${keyOf(view.distance)}`),
  })
}

function ViewRow({
  run,
  list,
}: {
  run: Run
  list: readonly string[]
}): ReactElement {
  const aspect = runAspect(run)
  const views = viewsOf(run.inputs)
  return (
    <OutputRow aspects={run.outputs.map(() => aspect)}>
      {(index) => {
        const assetId = run.outputs[index]
        const view = views[index]
        if (assetId === undefined) {
          return null
        }
        return (
          <figure className="flex flex-col gap-s1">
            <AssetTile
              assetId={assetId}
              aspectHint={aspect}
              isDemo={run.origin === "demo"}
              list={list}
              className={motion.enter}
            />
            {view === undefined ? null : (
              <figcaption className="text-caption text-ink-muted">
                {viewCaption(view)}
              </figcaption>
            )}
          </figure>
        )
      }}
    </OutputRow>
  )
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
      {run.status === "done" ? (
        <ViewRow run={run} list={list} />
      ) : (
        <RunOutputs run={run} />
      )}
    </article>
  )
}

export function AnglesCanvas(props: AnglesCanvasProps): ReactElement {
  const runs = useAppRuns(props.app)
  if (runs.isPending) {
    return <Skeleton className="h-tile w-1/2" />
  }
  const [latest, ...earlier] = runs.runs
  if (latest === undefined) {
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
  const list = runs.runs.flatMap((run) => run.outputs)
  return (
    <div className="flex flex-col gap-s6">
      <RunBlock run={latest} list={list} onUseInputs={props.onUseInputs} />
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
          onUseInputs={props.onUseInputs}
        />
      ))}
    </div>
  )
}
