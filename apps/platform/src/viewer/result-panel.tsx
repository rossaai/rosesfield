import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { CopyIcon, DownloadIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { isAssetInput, promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { formatDate } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import {
  idsOf,
  inputValueText,
  runAppName,
  runPrice,
} from "@/pieces/run/run-facts"
import { entryModel, type VisualEntry } from "@/screens/explore/explore-tile"

export function inputAssetIdsOf(run: Run): string[] {
  const app = findCatalogApp(run.appId)
  if (app === null) {
    return []
  }
  return app.inputs
    .filter(isAssetInput)
    .flatMap((input) => idsOf(run.inputs[input.name]))
}

export function promptOf(run: Run): string | null {
  const app = findCatalogApp(run.appId)
  const input = app === null ? null : promptInputOf(app)
  return input === null
    ? null
    : inputValueText(app, input, run.inputs[input.name])
}

function InputAssets({ run }: { run: Run }): ReactNode {
  const ids = inputAssetIdsOf(run)
  if (ids.length === 0) {
    return null
  }
  return (
    <section data-slot="viewer-inputs" className="flex flex-col gap-2">
      <h3 className="text-label text-ink-muted">
        {t("viewer.label.inputs")}
      </h3>
      <div className="flex gap-1 overflow-x-auto">
        {ids.map((assetId) => (
          <span key={assetId} className="size-18 shrink-0">
            <AssetTile assetId={assetId} shape="square" isStatic={true} />
          </span>
        ))}
      </div>
    </section>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-label text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-body text-ink">{children}</dd>
    </div>
  )
}

function Details({ entry }: { entry: VisualEntry }): ReactElement {
  const prompt = promptOf(entry.run)
  const model = entryModel(entry)
  return (
    <dl data-slot="viewer-details" className="flex flex-col gap-3">
      {prompt === null ? null : (
        <div className="flex flex-col gap-1">
          <dt className="text-label text-ink-muted">
            {t("viewer.label.prompt")}
          </dt>
          <dd className="whitespace-pre-wrap text-body text-ink">{prompt}</dd>
        </div>
      )}
      {model === null ? null : (
        <Detail label={t("viewer.label.model")}>{model}</Detail>
      )}
      <Detail label={t("explore.viewer.credits")}>
        {runPrice(entry.run)}
      </Detail>
    </dl>
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
  const app = runAppName(entry.run)
  return (
    <div
      data-slot="viewer-panel"
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <header data-slot="viewer-head" className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-medium text-body text-ink">
          {t("viewer.made", { app, date: formatDate(entry.run.createdAt) })}
        </p>
        <p
          data-slot="viewer-machine-made"
          className="text-label text-ink-muted"
        >
          {t("explore.tile.machineMade")}
        </p>
      </header>
      <InputAssets run={entry.run} />
      <Details entry={entry} />
      <span aria-hidden="true" className="flex-1" />
      <div className="flex flex-col gap-3">
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
