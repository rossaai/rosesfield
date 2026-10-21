import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { appEmptyTitle } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { RunLine } from "@/pieces/run/run-line"
import { useAppRuns } from "@/screens/app/app-canvas"
import { keptKeyframeOf } from "@/studio/storyboard/kept-keyframes"
import {
  type KeyframeBlock,
  keyframeBlocksOf,
} from "@/studio/storyboard/keyframe-blocks"
import { ChainKeyframes, KeyframeGrid } from "@/studio/storyboard/keyframe-grid"

type CanvasProps = {
  app: AppListing
  onUseInputs: (run: Run) => void
  emptyAction: ReactNode
}

function RunBlock({
  block,
  list,
  onUseInputs,
}: {
  block: KeyframeBlock
  list: readonly string[]
  onUseInputs: (run: Run) => void
}): ReactElement {
  return (
    <article className="flex flex-col gap-s2">
      <RunLine
        run={block.kind === "run" ? block.run : block.lead}
        onUseInputs={onUseInputs}
      />
      {block.kind === "run" ? (
        <KeyframeGrid run={block.run} list={list} />
      ) : (
        <ChainKeyframes block={block} list={list} />
      )}
    </article>
  )
}

function blockKey(block: KeyframeBlock): string {
  return block.kind === "run" ? block.run.id : block.lead.id
}

function CanvasSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-s2">
      <Skeleton className="h-s5 w-1/2" />
      <div className="grid grid-cols-2 gap-s2 @regular:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="aspect-video w-full" />
        ))}
      </div>
    </div>
  )
}

export function StoryboardCanvas({
  app,
  onUseInputs,
  emptyAction,
}: CanvasProps): ReactElement {
  const runs = useAppRuns(app)
  if (runs.isPending) {
    return <CanvasSkeleton />
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
            emptyAction
          )
        }
      />
    )
  }
  const list = runs.runs.flatMap((run) => run.outputs)
  const [latest, ...earlier] = keyframeBlocksOf(runs.runs, keptKeyframeOf)
  return (
    <div className="flex flex-col gap-s6">
      {latest === undefined ? null : (
        <RunBlock block={latest} list={list} onUseInputs={onUseInputs} />
      )}
      {earlier.length === 0 ? null : (
        <h2 className="text-body font-medium text-ink-muted">
          {t("app.history.title")}
        </h2>
      )}
      {earlier.map((block) => (
        <RunBlock
          key={blockKey(block)}
          block={block}
          list={list}
          onUseInputs={onUseInputs}
        />
      ))}
    </div>
  )
}
