import { type CatalogModel, isHostedModelId } from "@rosesfield/catalog/comfy"
import { type KeyframeFacts, keyframeOf } from "@rosesfield/catalog/storyboard"
import type { Asset, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { runQuery, settingsQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import {
  formatBytes,
  formatDate,
  formatDuration,
  joinParts,
} from "@/copy/format"
import { t } from "@/copy/t"
import { idsOf, runPrice, runSeconds } from "@/pieces/run/run-facts"
import { inputRowsOf } from "@/pieces/run/run-inputs"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { KeyframeAnchorDetail } from "@/studio/storyboard/keyframe-info"
import {
  Detail,
  inputAssetIdsOf,
  modelAndModeOf,
  PanelHead,
  PromptDetail,
  promptOf,
  RunSection,
} from "@/viewer/result-panel"
import { ViewerActions, ViewerManage } from "@/viewer/viewer-actions"

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

function hostedModelOf(run: Run | null): string | null {
  const model = run?.inputs[modelInputName]
  return typeof model === "string" && isHostedModelId(model) ? model : null
}

function modelFieldsOf(
  run: Run,
  models: readonly CatalogModel[],
  kind: "image" | "video"
): string[] {
  const model = models.find((one) => one.id === hostedModelOf(run))
  return (model?.form ?? []).flatMap((field) =>
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

export function useRunModels(run: Run | null): readonly CatalogModel[] {
  const isHosted = hostedModelOf(run) !== null
  const settings = useQuery({ ...settingsQuery, enabled: isHosted })
  const catalog = useQuery({
    ...modelCatalogQuery(
      run?.appId ?? "",
      settings.data?.engine.key ?? "unknown"
    ),
    enabled: isHosted && settings.data !== undefined,
  })
  return catalog.data?.models ?? []
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

function keyframePromptOf(
  run: Run,
  keyframe: KeyframeFacts | null
): string | null {
  return keyframe === null || keyframe.prompt === ""
    ? promptOf(run)
    : keyframe.prompt
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
        <PromptDetail prompt={keyframePromptOf(run, keyframe)} />
        {keyframe === null ? null : (
          <KeyframeAnchorDetail keyframe={keyframe} />
        )}
        {model === null ? null : (
          <Detail label={t("viewer.label.model")}>{model}</Detail>
        )}
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
        <Detail label={t("viewer.label.price")}>{runPrice(run)}</Detail>
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

export function useSourceRun(asset: Asset | null): {
  run: Run | null
  isPending: boolean
} {
  const runId = asset?.sourceRunId ?? null
  const run = useQuery({
    ...runQuery(runId ?? ""),
    enabled: runId !== null,
  })
  return {
    run: run.data?.run ?? null,
    isPending: runId !== null && run.isPending,
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
  const { run, isPending } = useSourceRun(asset)
  if (isPending) {
    return <Skeleton className="h-s12 w-full" />
  }
  return run === null ? (
    <UploadInfo asset={asset} measured={measured} />
  ) : (
    <MadeInfo run={run} assetId={asset.id} compare={compare} />
  )
}

export function ViewerInfo({
  asset,
  compare,
  measured,
  onDeleted,
}: {
  asset: Asset
  compare: ViewerCompare
  measured: MeasuredSize
  onDeleted: () => void
}): ReactElement {
  const { run } = useSourceRun(asset)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ViewerDetails asset={asset} compare={compare} measured={measured} />
      <ViewerManage asset={asset} run={run} onDeleted={onDeleted} />
      <span aria-hidden="true" className="flex-1" />
      <ViewerActions asset={asset} run={run} />
    </div>
  )
}
