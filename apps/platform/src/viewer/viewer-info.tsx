import type { Asset, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { runQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import {
  formatBytes,
  formatDate,
  formatDuration,
  joinParts,
} from "@/copy/format"
import { t } from "@/copy/t"
import {
  idsOf,
  runAppName,
  runModel,
  runPrice,
  runSeconds,
} from "@/pieces/run/run-facts"
import { RunInputs } from "@/pieces/run/run-inputs"
import { ViewerActions } from "@/viewer/viewer-actions"

export type ViewerCompare = {
  inputId: string | null
  isDemo: boolean
  isOn: boolean
  onToggle: () => void
}

function Row({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex flex-col gap-s1">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  )
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

export function compareInputOf(run: Run | null, asset: Asset): string | null {
  if (run === null || (asset.kind !== "image" && asset.kind !== "video")) {
    return null
  }
  const app = findCatalogApp(run.appId)
  const input = app?.inputs.find(
    (one) => one.type === asset.kind && idsOf(run.inputs[one.name]).length > 0
  )
  return input === undefined ? null : (idsOf(run.inputs[input.name])[0] ?? null)
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

function MadeInfo({
  run,
  compare,
}: {
  run: Run
  compare: ViewerCompare
}): ReactElement {
  const app = findCatalogApp(run.appId)
  const seconds = runSeconds(run)
  const model = runModel(run, app)
  return (
    <>
      <div className="flex flex-col gap-s1">
        <p className="text-body font-medium">
          {t("viewer.made", {
            app: runAppName(run),
            date: formatDate(run.createdAt),
          })}
        </p>
        {run.origin === "demo" ? (
          <p className="text-caption text-cem-text">{t("run.demoCaption")}</p>
        ) : null}
      </div>
      <CompareToggle compare={compare} />
      <section className="flex flex-col gap-s3">
        <h3 className="text-label font-medium text-ink">
          {t("viewer.label.inputs")}
        </h3>
        <RunInputs app={app} run={run} />
      </section>
      <dl className="flex flex-col gap-s3">
        {model === null ? null : (
          <Row label={t("viewer.label.model")}>{model}</Row>
        )}
        {seconds === null ? null : (
          <Row label={t("viewer.label.time")}>
            {t("run.made", { duration: formatDuration(seconds) })}
          </Row>
        )}
        <Row label={t("viewer.label.price")}>{runPrice(run)}</Row>
      </dl>
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
      <p className="text-body font-medium">
        {t("viewer.uploaded", { date: formatDate(asset.createdAt) })}
      </p>
      <dl className="flex flex-col gap-s3">
        <Row label={t("viewer.label.size")}>{sizeOf(asset, measured)}</Row>
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
    <MadeInfo run={run} compare={compare} />
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
    <div className="flex flex-col gap-s4">
      <ViewerDetails asset={asset} compare={compare} measured={measured} />
      <ViewerActions asset={asset} run={run} onDeleted={onDeleted} />
    </div>
  )
}
