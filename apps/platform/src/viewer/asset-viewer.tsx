import type { Asset } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { Viewer, type ViewerStep } from "@rosesfield/ui/components/viewer"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useSearch } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useEffect, useState } from "react"
import { assetQuery, assetsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { useAssetName } from "@/pieces/asset-name"
import { aspectOfAsset } from "@/pieces/asset-tile"
import { CompareDivider } from "@/pieces/compare-divider"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { readText } from "@/shell/search"
import { ViewerBar } from "@/viewer/viewer-actions"
import { useViewer } from "@/viewer/viewer-context"
import {
  compareInputOf,
  type MeasuredSize,
  useSourceRun,
  type ViewerCompare,
  ViewerDetails,
  ViewerInfo,
} from "@/viewer/viewer-info"
import { ViewerMedia, ViewerMissing } from "@/viewer/viewer-media"
import { stageAspectOf } from "@/viewer/viewer-video"

const square: MediaAspect = { width: 1, height: 1 }
const audioAspect: MediaAspect = { width: 4, height: 1 }
const textAspect: MediaAspect = { width: 4, height: 5 }

function mediaAspectOf(
  asset: Asset | undefined,
  measured: MediaAspect | null
): MediaAspect {
  if (asset === undefined) {
    return square
  }
  if (asset.kind === "audio") {
    return audioAspect
  }
  if (asset.kind === "text") {
    return textAspect
  }
  return aspectOfAsset(asset, measured ?? square) ?? square
}

function frameAspect(
  asset: Asset | undefined,
  aspect: MediaAspect,
  isRegular: boolean
): MediaAspect {
  return asset?.kind === "video"
    ? stageAspectOf(aspect, "video", isRegular)
    : aspect
}

function isUsable(aspect: MediaAspect): boolean {
  return aspect.width > 0 && aspect.height > 0
}

function useStepList(assetId: string): readonly string[] {
  const viewer = useViewer()
  const trail = viewer.trail.list
  const isOnTrail = trail.includes(assetId)
  const library = useInfiniteQuery({
    ...assetsQuery(null),
    enabled: !isOnTrail,
  })
  if (isOnTrail) {
    return trail
  }
  return (
    library.data?.pages.flatMap((page) => page.assets.map((one) => one.id)) ??
    []
  )
}

function useSteps(assetId: string): {
  previous?: ViewerStep
  next?: ViewerStep
} {
  const viewer = useViewer()
  const list = useStepList(assetId)
  const index = list.indexOf(assetId)
  const before = index > 0 ? list[index - 1] : undefined
  const after = index >= 0 ? list[index + 1] : undefined
  return {
    ...(before === undefined
      ? {}
      : {
          previous: {
            label: t("viewer.previous"),
            onSelect: () => viewer.step(before),
          },
        }),
    ...(after === undefined
      ? {}
      : {
          next: { label: t("viewer.next"), onSelect: () => viewer.step(after) },
        }),
  }
}

function PhoneBar({
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
    <ViewerBar
      asset={asset}
      run={run}
      onDeleted={onDeleted}
      details={
        <ViewerDetails asset={asset} compare={compare} measured={measured} />
      }
    />
  )
}

function useCompare(asset: Asset | undefined): ViewerCompare {
  const { run } = useSourceRun(asset ?? null)
  const [shown, setShown] = useState<string | null>(null)
  const inputId = asset === undefined ? null : compareInputOf(run, asset)
  const isOn = inputId !== null && shown === asset?.id
  return {
    inputId,
    isDemo: run?.origin === "demo",
    isOn,
    onToggle: () => setShown(isOn ? null : (asset?.id ?? null)),
  }
}

function LayerMedia({
  record,
  aspect,
  isMissing,
  compare,
  onMeasure,
}: {
  record: Asset | undefined
  aspect: MediaAspect
  isMissing: boolean
  compare: ViewerCompare
  onMeasure: (aspect: MediaAspect) => void
}): ReactElement {
  if (record !== undefined && compare.isOn && compare.inputId !== null) {
    return (
      <CompareDivider
        inputId={compare.inputId}
        outputId={record.id}
        kind={record.kind === "video" ? "video" : "image"}
        isDemo={compare.isDemo}
      />
    )
  }
  if (record !== undefined) {
    return <ViewerMedia asset={record} aspect={aspect} onMeasure={onMeasure} />
  }
  return isMissing ? <ViewerMissing /> : <Skeleton className="size-full" />
}

function useMeasured(assetId: string): {
  pixels: MediaAspect | null
  onMeasure: (aspect: MediaAspect) => void
} {
  const [measured, setMeasured] = useState<{
    id: string
    aspect: MediaAspect
  } | null>(null)
  return {
    pixels: measured?.id === assetId ? measured.aspect : null,
    onMeasure: (aspect) => {
      if (isUsable(aspect)) {
        setMeasured({ id: assetId, aspect })
      }
    },
  }
}

function ViewerLayer({
  assetId,
  open,
}: {
  assetId: string
  open: boolean
}): ReactElement {
  const viewer = useViewer()
  const asset = useQuery(assetQuery(assetId))
  const record = asset.data?.asset
  const name = useAssetName(record)
  const steps = useSteps(assetId)
  const compare = useCompare(record)
  const { pixels, onMeasure } = useMeasured(assetId)
  const aspect = mediaAspectOf(record, pixels)
  const isRegular = useIsRegularWindow()
  return (
    <Viewer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          viewer.close()
        }
      }}
      origin={viewer.trail.origin}
      aspect={frameAspect(record, aspect, isRegular)}
      title={name ?? t("viewer.info")}
      closeLabel={t("viewer.close")}
      aside={
        record === undefined ? undefined : (
          <ViewerInfo
            asset={record}
            compare={compare}
            measured={pixels}
            onDeleted={viewer.close}
          />
        )
      }
      bar={
        record === undefined ? undefined : (
          <PhoneBar
            asset={record}
            compare={compare}
            measured={pixels}
            onDeleted={viewer.close}
          />
        )
      }
      {...steps}
    >
      <LayerMedia
        record={record}
        aspect={aspect}
        isMissing={asset.isError}
        compare={compare}
        onMeasure={onMeasure}
      />
    </Viewer>
  )
}

export function AssetViewer(): ReactNode {
  const search = useSearch({ strict: false })
  const view = readText(search.view)
  const [shown, setShown] = useState<string | null>(view ?? null)
  useEffect(() => {
    if (view !== undefined) {
      setShown(view)
    }
  }, [view])
  if (shown === null) {
    return null
  }
  return <ViewerLayer assetId={shown} open={view !== undefined} />
}
