import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type KeyframeFacts, keyframeOf } from "@rosesfield/catalog/storyboard"
import type { Asset, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { runQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { wordsForError } from "@/copy/error-words"
import {
  formatBytes,
  formatDate,
  formatDuration,
  joinParts,
} from "@/copy/format"
import { t } from "@/copy/t"
import {
  idsOf,
  runPrice,
  runPriceAmount,
  runSeconds,
} from "@/pieces/run/run-facts"
import { inputRowsOf } from "@/pieces/run/run-inputs"
import { RunShotRows } from "@/studio/remake/shot-details"
import { KeyframeAnchorDetail } from "@/studio/storyboard/keyframe-info"
import {
  Detail,
  inputAssetIdsOf,
  modelAndModeOf,
  outputPromptOf,
  PanelHead,
  PromptDetail,
  RunSection,
} from "@/viewer/result-panel"
import { runFieldsOf, useRunModels } from "@/viewer/use-run-models"
import { ViewerActions } from "@/viewer/viewer-actions"

export type ViewerCompare = {
  inputId: string | null
  isDemo: boolean
  isOn: boolean
  onToggle: () => void
}

export type MeasuredSize = { width: number; height: number } | null

function pixelsOf(asset: Asset, measured: MeasuredSize): string | null {
  if (asset.width !== null && asset.height !== null) {
    return t("viewer.pixels", { width: asset.width, height: asset.height })
  }
  if (measured === null || asset.kind === "audio" || asset.kind === "text") {
    return null
  }
  return t("viewer.pixels", { width: measured.width, height: measured.height })
}

function sizeOf(asset: Asset, measured: MeasuredSize): string {
  const pixels = pixelsOf(asset, measured)
  const length =
    asset.durationSeconds === null
      ? null
      : formatDuration(asset.durationSeconds)
  return joinParts([formatBytes(asset.bytes), pixels ?? length])
}

function modelFieldsOf(
  run: Run,
  models: readonly CatalogModel[],
  kind: "image" | "video"
): string[] {
  return (runFieldsOf(run, models) ?? []).flatMap((field) =>
    field.kind === "media" && field.media === kind ? [field.name] : []
  )
}

export function compareInputOf(
  run: Run | null,
  asset: Asset,
  models: readonly CatalogModel[]
): string | null {
  if (run === null || (asset.kind !== "image" && asset.kind !== "video")) {
    return null
  }
  const kind = asset.kind
  const appInputs = (findCatalogApp(run.appId)?.inputs ?? []).flatMap((one) =>
    one.type === kind ? [one.name] : []
  )
  const names = [...appInputs, ...modelFieldsOf(run, models, kind)]
  const held = names.find((name) => idsOf(run.inputs[name]).length > 0)
  return held === undefined ? null : (idsOf(run.inputs[held])[0] ?? null)
}

function CompareToggle({ compare }: { compare: ViewerCompare }): ReactNode {
  if (compare.inputId === null) {
    return null
  }
  return (
    <Button
      className="w-full max-w-none aria-pressed:bg-(--tint)"
      aria-pressed={compare.isOn}
      onClick={compare.onToggle}
    >
      {t("viewer.compare")}
    </Button>
  )
}

function detailRowsOf(
  run: Run,
  keyframe: KeyframeFacts | null
): Array<{ key: string; label: string; value: ReactNode }> {
  const app = findCatalogApp(run.appId)
  if (app === null) {
    return []
  }
  const isCharacterAnchor = keyframe?.anchor.kind === "character"
  const shownElsewhere = new Set(
    app.inputs
      .filter(
        (input) =>
          isAssetInput(input) ||
          input.type === "prompt" ||
          input.name === "mode" ||
          input.name === "model" ||
          (isCharacterAnchor && input.type === "character")
      )
      .map((input) => input.name)
  )
  return inputRowsOf(app, run).filter((row) => !shownElsewhere.has(row.key))
}

function MadeInfo({
  run,
  assetId,
  compare,
}: {
  run: Run
  assetId: string
  compare: ViewerCompare
}): ReactElement {
  const seconds = runSeconds(run)
  const model = modelAndModeOf(run)
  const keyframe = keyframeOf(run, assetId)
  const models = useRunModels(run)
  const price = runPrice(run)
  const amount = runPriceAmount(run)
  return (
    <>
      <PanelHead run={run} line={formatDate(run.createdAt)} />
      {run.origin === "demo" ? (
        <p className="px-1 text-caption text-ink-muted">
          {t("run.demoCaption")}
        </p>
      ) : null}
      <CompareToggle compare={compare} />
      <RunSection inputIds={inputAssetIdsOf(run)}>
        <PromptDetail prompt={outputPromptOf(run, assetId, models)} />
        {keyframe === null ? null : (
          <KeyframeAnchorDetail keyframe={keyframe} />
        )}
        {model === null ? null : (
          <Detail label={t("viewer.label.model")}>{model}</Detail>
        )}
        <RunShotRows run={run} />
        {detailRowsOf(run, keyframe).map((row) => (
          <Detail key={row.key} label={row.label}>
            {row.value}
          </Detail>
        ))}
        {seconds === null ? null : (
          <Detail label={t("viewer.label.time")}>
            {t("run.made", { duration: formatDuration(seconds) })}
          </Detail>
        )}
        {price === null ? null : (
          <Detail label={t("viewer.label.price")}>
            {amount === null ? price : <CreditPrice amount={amount} />}
          </Detail>
        )}
      </RunSection>
    </>
  )
}

function UploadInfo({
  asset,
  measured,
}: {
  asset: Asset
  measured: MeasuredSize
}): ReactElement {
  return (
    <>
      <p className="px-1 pe-9 font-medium text-body">
        {t("viewer.uploaded", { date: formatDate(asset.createdAt) })}
      </p>
      <dl className="flex flex-col rounded-card bg-(--well) px-2 py-1">
        <Detail label={t("viewer.label.size")}>
          {sizeOf(asset, measured)}
        </Detail>
      </dl>
    </>
  )
}

function RunFailed({
  failure,
  isRetrying,
  onRetry,
}: {
  failure: unknown
  isRetrying: boolean
  onRetry: () => void
}): ReactElement {
  const words = wordsForError(failure, { thing: "run" })
  return (
    <StateView
      kind="failed"
      density="compact"
      title={words.title}
      body={words.body}
      actions={
        words.action === null ? undefined : (
          <Button busy={isRetrying} onClick={onRetry}>
            {words.action.label}
          </Button>
        )
      }
    />
  )
}

export function useSourceRun(asset: Asset | null): {
  run: Run | null
  isPending: boolean
  failure: unknown
  isRetrying: boolean
  retry: () => void
} {
  const runId = asset?.sourceRunId ?? null
  const run = useQuery({
    ...runQuery(runId ?? ""),
    enabled: runId !== null,
  })
  return {
    run: run.data?.run ?? null,
    isPending: runId !== null && run.isPending,
    failure: runId !== null && run.isError ? run.error : null,
    isRetrying: run.isFetching,
    retry: () => void run.refetch(),
  }
}

export function ViewerDetails({
  asset,
  compare,
  measured,
}: {
  asset: Asset
  compare: ViewerCompare
  measured: MeasuredSize
}): ReactElement {
  const { run, isPending, failure, isRetrying, retry } = useSourceRun(asset)
  if (isPending) {
    return <Skeleton className="h-s12 w-full" />
  }
  if (run !== null) {
    return <MadeInfo run={run} assetId={asset.id} compare={compare} />
  }
  return failure === null ? (
    <UploadInfo asset={asset} measured={measured} />
  ) : (
    <RunFailed failure={failure} isRetrying={isRetrying} onRetry={retry} />
  )
}

export function ViewerInfo({
  asset,
  compare,
  measured,
}: {
  asset: Asset
  compare: ViewerCompare
  measured: MeasuredSize
}): ReactElement {
  return (
    <div data-slot="viewer-info" className="flex flex-col gap-s4">
      <ViewerDetails asset={asset} compare={compare} measured={measured} />
    </div>
  )
}

export function ViewerFoot({
  asset,
  onDeleted,
}: {
  asset: Asset
  onDeleted: () => void
}): ReactElement {
  const { run } = useSourceRun(asset)
  return <ViewerActions asset={asset} run={run} onDeleted={onDeleted} />
}
