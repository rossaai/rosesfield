import { adsAppId, adsRunPromptOf } from "@rosesfield/catalog/ads"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { keyframeOf } from "@rosesfield/catalog/storyboard"
import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { CopyIcon, DownloadIcon, ImagesIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { isAssetInput, promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { formatDate, joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import {
  idsOf,
  inputValueText,
  runAppName,
  runModel,
  runPrice,
} from "@/pieces/run/run-facts"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { appIcon } from "@/shell/nav-rows"
import { runFieldsOf, useRunModels } from "@/viewer/use-run-models"

const modeInputName = "mode"

export function inputAssetIdsOf(run: Run): string[] {
  const app = findCatalogApp(run.appId)
  if (app === null) {
    return []
  }
  return app.inputs
    .filter(isAssetInput)
    .flatMap((input) => idsOf(run.inputs[input.name]))
}

export function promptOf(
  run: Run,
  models: readonly CatalogModel[]
): string | null {
  if (run.appId === adsAppId) {
    return adsRunPromptOf(run, runFieldsOf(run, models))
  }
  const app = findCatalogApp(run.appId)
  const input = app === null ? null : promptInputOf(app)
  return input === null
    ? null
    : inputValueText(app, input, run.inputs[input.name])
}

export function outputPromptOf(
  run: Run,
  assetId: string | null,
  models: readonly CatalogModel[]
): string | null {
  const keyframe = assetId === null ? null : keyframeOf(run, assetId)
  return keyframe === null || keyframe.prompt === ""
    ? promptOf(run, models)
    : keyframe.prompt
}

export function modelAndModeOf(run: Run): string | null {
  const app = findCatalogApp(run.appId)
  const input = app?.inputs.find((one) => one.name === modeInputName)
  const mode =
    app === null || input === undefined
      ? null
      : inputValueText(app, input, run.inputs[modeInputName])
  const value = joinParts([runModel(run, app), mode])
  return value === "" ? null : value
}

export function PanelHead({
  run,
  line,
}: {
  run: Run
  line: string
}): ReactElement {
  const app = findCatalogApp(run.appId)
  return (
    <header
      data-slot="viewer-head"
      className="flex min-w-0 items-center gap-3 ps-1 pe-9"
    >
      <span
        aria-hidden="true"
        data-slot="viewer-head-mark"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--well) text-ink [&_svg]:size-5"
      >
        {app === null ? null : appIcon(app)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-body text-ink">
          {runAppName(run)}
        </span>
        <span className="truncate text-label text-ink-muted">{line}</span>
      </span>
    </header>
  )
}

function InputAssets({ ids }: { ids: readonly string[] }): ReactNode {
  if (ids.length === 0) {
    return null
  }
  return (
    <div data-slot="viewer-inputs" className="flex flex-col">
      <h3 className="flex h-11 items-center gap-2 px-2 text-label text-ink-muted [&_svg]:size-4">
        <ImagesIcon aria-hidden="true" />
        {t("viewer.label.inputs")}
      </h3>
      <div
        data-slot="viewer-input-strip"
        className="-me-2 flex gap-1 overflow-x-auto ps-3 pe-5 py-4.5"
      >
        {ids.map((assetId) => (
          <span
            key={assetId}
            data-slot="viewer-input"
            className="size-18 shrink-0"
          >
            <AssetTile assetId={assetId} shape="square" isStatic={true} />
          </span>
        ))}
      </div>
    </div>
  )
}

export function Detail({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 px-2">
      <dt className="shrink-0 text-label text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-body text-ink">{children}</dd>
    </div>
  )
}

export function PromptDetail({ prompt }: { prompt: string | null }): ReactNode {
  if (prompt === null) {
    return null
  }
  return (
    <div className="flex flex-col gap-1 px-2 py-2.5">
      <dt className="text-label text-ink-muted">{t("viewer.label.prompt")}</dt>
      <dd className="whitespace-pre-wrap text-body text-ink">{prompt}</dd>
    </div>
  )
}

export function RunSection({
  inputIds,
  children,
}: {
  inputIds: readonly string[]
  children: ReactNode
}): ReactElement {
  return (
    <section
      data-slot="viewer-run"
      className="flex flex-col rounded-card bg-(--well) px-2 pb-2.5"
    >
      <InputAssets ids={inputIds} />
      <dl data-slot="viewer-details" className="flex flex-col">
        {children}
      </dl>
    </section>
  )
}

type ResultPanelProps = {
  entry: VisualEntry
  isDownloading: boolean
  onRecreate: () => void
  onDownload: () => void
}

export function ResultPanel({
  entry,
  isDownloading,
  onRecreate,
  onDownload,
}: ResultPanelProps): ReactElement {
  const model = modelAndModeOf(entry.run)
  const models = useRunModels(entry.run)
  const assetId = entry.source.kind === "own" ? entry.source.assetId : null
  const price = runPrice(entry.run)
  return (
    <div
      data-slot="viewer-panel"
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <PanelHead run={entry.run} line={formatDate(entry.run.createdAt)} />
      <RunSection inputIds={inputAssetIdsOf(entry.run)}>
        <PromptDetail prompt={outputPromptOf(entry.run, assetId, models)} />
        {model === null ? null : (
          <Detail label={t("viewer.label.model")}>{model}</Detail>
        )}
        {price === null ? null : (
          <Detail label={t("explore.viewer.credits")}>{price}</Detail>
        )}
      </RunSection>
      <span aria-hidden="true" className="flex-1" />
      <div data-slot="viewer-foot" className="flex flex-col gap-2.5">
        <Button tone="accent" width="full" onClick={onRecreate}>
          <CopyIcon aria-hidden="true" />
          {t("explore.viewer.recreate")}
        </Button>
        <Button width="full" busy={isDownloading} onClick={onDownload}>
          <DownloadIcon aria-hidden="true" />
          {t("output.download")}
        </Button>
      </div>
    </div>
  )
}
