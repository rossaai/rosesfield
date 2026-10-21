import type { Run } from "@rosesfield/contract"
import { Progress } from "@rosesfield/ui/components/progress"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"
import { t, tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { runAspect } from "@/pieces/run/run-facts"
import { RunOutputs, WaitingLine } from "@/pieces/run/run-outputs"

function Keyframe({
  number,
  children,
}: {
  number: number
  children: ReactNode
}): ReactElement {
  return (
    <li className="relative min-w-0">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute top-s2 left-s2 rounded-full bg-canvas px-s2 text-caption text-ink"
      >
        {number}
      </span>
      <span className="sr-only">
        {tCatalog("storyboard.keyframe.number", { number })}
      </span>
    </li>
  )
}

function Grid({ children }: { children: ReactNode }): ReactElement {
  return (
    <ol
      data-slot="keyframe-grid"
      className="grid w-full grid-cols-2 gap-s2 @regular:grid-cols-4"
    >
      {children}
    </ol>
  )
}

function LandedKeyframe({
  run,
  assetId,
  list,
}: {
  run: Run
  assetId: string
  list: readonly string[]
}): ReactElement {
  return (
    <AssetTile
      assetId={assetId}
      aspectHint={runAspect(run)}
      isDemo={run.origin === "demo"}
      list={list}
      className={motion.enter}
    />
  )
}

function WorkingKeyframes({
  run,
  list,
}: {
  run: Run
  list: readonly string[]
}): ReactElement {
  const aspect = runAspect(run)
  return (
    <div className="flex flex-col gap-s2">
      <Grid>
        {Array.from({ length: run.count }, (_, index) => {
          const landed = run.outputs[index]
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a keyframe's place in its run is its scene number
            <Keyframe key={index} number={index + 1}>
              {landed === undefined ? (
                <WorkingPulse
                  aspect={aspect}
                  label={t("run.working", {
                    index: index + 1,
                    count: run.count,
                  })}
                />
              ) : (
                <LandedKeyframe run={run} assetId={landed} list={list} />
              )}
            </Keyframe>
          )
        })}
      </Grid>
      {run.progress === null ? null : (
        <Progress value={run.progress * 100} aria-label={t("state.working")} />
      )}
      <WaitingLine run={run} />
    </div>
  )
}

function DoneKeyframes({
  run,
  list,
}: {
  run: Run
  list: readonly string[]
}): ReactElement {
  return (
    <Grid>
      {run.outputs.map((assetId, index) => (
        <Keyframe key={assetId} number={index + 1}>
          <LandedKeyframe run={run} assetId={assetId} list={list} />
        </Keyframe>
      ))}
    </Grid>
  )
}

export function KeyframeGrid({
  run,
  list,
}: {
  run: Run
  list: readonly string[]
}): ReactElement {
  switch (run.status) {
    case "queued":
    case "running":
      return <WorkingKeyframes run={run} list={list} />
    case "done":
      return <DoneKeyframes run={run} list={list} />
    default:
      return <RunOutputs run={run} list={list} />
  }
}
