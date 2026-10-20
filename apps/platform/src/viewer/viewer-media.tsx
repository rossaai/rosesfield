import type { Asset } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t } from "@/copy/t"
import { useDownloadAsset } from "@/pieces/asset-actions"
import { assetLabel, useAssetName } from "@/pieces/asset-name"
import { AudioRow } from "@/pieces/audio-row"
import { TextOutput } from "@/pieces/text-output"
import { ViewerVideo } from "@/viewer/viewer-video"

function Failed({ retry }: { retry: () => void }): ReactElement {
  return (
    <div
      data-ground="layer"
      className="grid size-full place-items-center bg-layer"
    >
      <StateView
        kind="failed"
        density="compact"
        title={t("viewer.failed.title")}
        actions={<Button onClick={retry}>{t("state.tryAgain")}</Button>}
      />
    </div>
  )
}

type ViewerMediaProps = {
  asset: Asset
  onMeasure: (aspect: MediaAspect) => void
}

export function ViewerMedia({
  asset,
  onMeasure,
}: ViewerMediaProps): ReactElement {
  const source = useAssetSource(asset.id)
  const download = useDownloadAsset()
  const name = useAssetName(asset) ?? assetLabel(asset)
  if (source.state === "loading") {
    return <Skeleton className="size-full" />
  }
  if (source.state === "failed") {
    return <Failed retry={source.retry} />
  }
  switch (asset.kind) {
    case "image":
      return (
        <img
          src={source.src}
          alt={name}
          className="size-full object-contain"
          onLoad={(event) =>
            onMeasure({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
        />
      )
    case "video":
      return <ViewerVideo src={source.src} label={name} onMeasure={onMeasure} />
    case "audio":
      return (
        <div className="grid size-full place-items-center p-s4">
          <AudioRow
            src={source.src}
            name={name}
            durationSeconds={asset.durationSeconds}
            onDownload={() => void download(asset)}
          />
        </div>
      )
    case "text":
      return <TextOutput asset={asset} />
  }
}

export function ViewerMissing(): ReactElement {
  return (
    <div
      data-ground="layer"
      className="grid size-full place-items-center bg-layer"
    >
      <StateView
        kind="empty"
        density="compact"
        title={t("viewer.missing.title")}
      />
    </div>
  )
}
