import { type Mode, viewsOf } from "@rosesfield/catalog/characters"
import {
  type AppListing,
  characterPhotoLimit,
  type Run,
} from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { characterQuery } from "@/api/queries"
import { appEmptyTitle } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { OutputRow } from "@/pieces/run/output-row"
import { runAspect } from "@/pieces/run/run-facts"
import { RunLine } from "@/pieces/run/run-line"
import { RunOutputs } from "@/pieces/run/run-outputs"
import { useAppRuns } from "@/screens/app/app-canvas"
import { useUpdateCharacter } from "@/screens/characters/character-actions"
import { modeOfRun, viewInput } from "@/studio/characters/mode-listing"
import { SaveCharacterButton } from "@/studio/characters/save-character-dialog"

type ModeCanvasProps = {
  app: AppListing
  mode: Mode
  shows: readonly Mode[]
  onUseInputs: (run: Run) => void
  emptyAction: ReactNode
}

function characterOf(run: Run): string | null {
  const value = run.inputs.character
  return Array.isArray(value) ? (value[0] ?? null) : null
}

function viewCaption(run: Run, index: number): string {
  const angleSet =
    typeof run.inputs.angleSet === "string" ? run.inputs.angleSet : ""
  const views = viewsOf(angleSet)
  const first = views.findIndex((one) => one === run.inputs[viewInput])
  const view = views[Math.max(first, 0) + index]
  return view === undefined ? "" : tCatalog(`characters.view.${view}`)
}

function AddToCharacter({
  characterId,
  assetId,
}: {
  characterId: string
  assetId: string
}): ReactNode {
  const found = useQuery(characterQuery(characterId))
  const update = useUpdateCharacter(characterId)
  const references = found.data?.character.references ?? []
  const isAdded = references.some((one) => one === assetId)
  return (
    <Button
      size="small"
      busy={update.isPending}
      disabled={
        found.data === undefined ||
        isAdded ||
        references.length >= characterPhotoLimit
      }
      onClick={() => update.mutate({ references: [...references, assetId] })}
    >
      {isAdded
        ? tCatalog("characters.studio.added")
        : t("characters.detail.addToCharacter")}
    </Button>
  )
}

function ViewRow({ run }: { run: Run }): ReactElement {
  const aspect = runAspect(run)
  const characterId = characterOf(run)
  return (
    <OutputRow aspects={run.outputs.map(() => aspect)}>
      {(index) => {
        const assetId = run.outputs[index]
        if (assetId === undefined) {
          return null
        }
        return (
          <figure className="flex flex-col gap-s1">
            <AssetTile
              assetId={assetId}
              aspectHint={aspect}
              isDemo={run.origin === "demo"}
              list={run.outputs}
            />
            <figcaption className="text-caption text-ink-muted">
              {viewCaption(run, index)}
            </figcaption>
            {characterId === null ? null : (
              <AddToCharacter characterId={characterId} assetId={assetId} />
            )}
          </figure>
        )
      }}
    </OutputRow>
  )
}

function RunBlock({
  run,
  onUseInputs,
}: {
  run: Run
  onUseInputs: (run: Run) => void
}): ReactElement {
  const isDone = run.status === "done"
  const mode = modeOfRun(run)
  return (
    <article className="flex flex-col gap-s2">
      <RunLine run={run} onUseInputs={() => onUseInputs(run)} />
      {isDone && mode === "angles" ? (
        <ViewRow run={run} />
      ) : (
        <RunOutputs run={run} />
      )}
      {isDone && mode === "traits" && run.outputs.length > 0 ? (
        <div>
          <SaveCharacterButton run={run} />
        </div>
      ) : null}
    </article>
  )
}

export function ModeCanvas(props: ModeCanvasProps): ReactElement {
  const { app, mode } = props
  const runs = useAppRuns(app)
  if (runs.isPending) {
    return <Skeleton className="h-tile w-1/2" />
  }
  const shown = runs.runs.filter((run) => props.shows.includes(modeOfRun(run)))
  if (shown.length === 0) {
    const isAngles = mode === "angles"
    return (
      <StateView
        kind={runs.isError ? "failed" : "empty"}
        title={
          runs.isError
            ? t("history.failed.title")
            : isAngles
              ? tCatalog("characters.studio.anglesEmpty")
              : appEmptyTitle(app)
        }
        body={
          isAngles
            ? tCatalog("characters.studio.anglesBody")
            : t("app.empty.body")
        }
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
    <div className="flex flex-col gap-s6">
      {shown.map((run) => (
        <RunBlock key={run.id} run={run} onUseInputs={props.onUseInputs} />
      ))}
    </div>
  )
}
