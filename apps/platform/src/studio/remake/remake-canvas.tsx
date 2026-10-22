import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { isWorking } from "@/api/queries"
import { appEmptyTitle, aspectOf, defaultAspectOf } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { aspectStyle } from "@/pieces/asset-tile"
import { RunCard } from "@/pieces/run/run-card"
import {
  type RunChromeOf,
  RunFrame,
  RunOutputs,
} from "@/pieces/run/run-outputs"
import { useAppRuns } from "@/screens/app/app-canvas"
import { PlanView } from "@/studio/remake/plan-view"
import { RemakePair } from "@/studio/remake/remake-pair"
import {
  type ShotProblem,
  shotProblemCopyOf,
  shotProblemOfCode,
} from "../../../../../packages/catalog/src/remake/shot-plan"

type RemakeCanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction: ReactNode
}

function refusedEditOf(run: Run): ShotProblem | null {
  return run.status === "failed" && run.failure !== null
    ? shotProblemOfCode(run.failure.code)
    : null
}

function RefusedEdit({ problem }: { problem: ShotProblem }): ReactElement {
  const copy = shotProblemCopyOf(problem)
  return (
    <StateView
      kind="failed"
      density="compact"
      title={tCatalog(copy.titleKey, copy.values)}
      body={tCatalog(copy.bodyKey, copy.values)}
    />
  )
}

function RemakeOutputs({
  run,
  chrome,
}: {
  run: Run
  chrome: RunChromeOf
}): ReactElement {
  const problem = refusedEditOf(run)
  return problem === null ? (
    <RunOutputs run={run} chrome={chrome} />
  ) : (
    <RunFrame chrome={chrome} place="under">
      <RefusedEdit problem={problem} />
    </RunFrame>
  )
}

function RemakeRun({
  run,
  onUseInputs,
}: {
  run: Run
  onUseInputs: (run: Run) => void
}): ReactElement {
  const [outputId] = run.outputs
  const plan = run.plan ?? null
  return (
    <RunCard run={run} onUseInputs={onUseInputs}>
      {(chrome) => (
        <>
          {run.status === "done" && outputId !== undefined ? (
            <RunFrame chrome={chrome}>
              <RemakePair run={run} outputId={outputId} plan={plan} />
            </RunFrame>
          ) : (
            <RemakeOutputs run={run} chrome={chrome} />
          )}
          {plan !== null && isWorking(run) ? (
            <PlanView run={run} plan={plan} />
          ) : null}
        </>
      )}
    </RunCard>
  )
}

function CanvasSkeleton({ app }: { app: AppListing }): ReactElement {
  const aspect = aspectOf(defaultAspectOf(app))
  return (
    <div className="flex flex-col gap-s2">
      <div className="grid grid-cols-2 gap-s2">
        <Skeleton className="w-full" style={aspectStyle(aspect)} />
        <Skeleton className="w-full" style={aspectStyle(aspect)} />
      </div>
    </div>
  )
}

export function RemakeCanvas({
  app,
  onUseInputs,
  emptyAction,
}: RemakeCanvasProps): ReactElement {
  const runs = useAppRuns(app)
  if (runs.isPending) {
    return <CanvasSkeleton app={app} />
  }
  const [latest, ...earlier] = runs.runs
  if (latest === undefined) {
    return (
      <StateView
        kind={runs.isError ? "failed" : "empty"}
        title={runs.isError ? t("history.failed.title") : appEmptyTitle(app)}
        body={t("app.empty.body")}
        actions={
          runs.isError ? (
            <Button onClick={runs.refetch}>{t("state.tryAgain")}</Button>
          ) : (
            emptyAction
          )
        }
      />
    )
  }
  return (
    <div className="flex flex-col gap-s6">
      <RemakeRun run={latest} onUseInputs={onUseInputs} />
      {earlier.map((run) => (
        <RemakeRun key={run.id} run={run} onUseInputs={onUseInputs} />
      ))}
    </div>
  )
}
