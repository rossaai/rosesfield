import type { Asset } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { RotateCcwIcon } from "lucide-react"
import type { CSSProperties, ReactElement } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import { t } from "@/copy/t"
import { useDownloadAsset } from "@/pieces/asset-actions"
import { AssetContextMenu } from "@/pieces/asset-context-menu"
import { assetLabel, assetLength, useAssetName } from "@/pieces/asset-name"
import { AssetThumb } from "@/pieces/asset-thumb"
import { AudioRow } from "@/pieces/audio-row"
import { TextOutput } from "@/pieces/text-output"
import { useViewer } from "@/viewer/viewer-context"

export type AssetTileProps = {
  assetId: string
  list?: readonly string[]
  aspectHint?: MediaAspect
  isDemo?: boolean
  shape?: "own" | "square" | "frame"
  fit?: "cover" | "contain"
  isStatic?: boolean
  hasMenu?: boolean
  isBare?: boolean
  className?: string
}

const square: MediaAspect = { width: 1, height: 1 }

export function aspectStyle(aspect: MediaAspect | undefined): CSSProperties {
  return aspect === undefined
    ? {}
    : { aspectRatio: `${aspect.width} / ${aspect.height}` }
}

export function aspectOfAsset(
  asset: Asset,
  hint: MediaAspect | undefined
): MediaAspect | undefined {
  return asset.width !== null && asset.height !== null
    ? { width: asset.width, height: asset.height }
    : hint
}

function keepShape(
  client: QueryClient,
  asset: Asset,
  shape: MediaAspect
): void {
  client.setQueryData(assetQuery(asset.id).queryKey, (held) =>
    held === undefined ||
    held.asset.width !== null ||
    held.asset.height !== null
      ? held
      : { ...held, asset: { ...held.asset, ...shape } }
  )
}

function shapedAspect(
  props: AssetTileProps,
  asset: Asset
): MediaAspect | undefined {
  if (props.shape === "square") {
    return square
  }
  if (props.shape === "frame") {
    return props.aspectHint
  }
  return aspectOfAsset(asset, props.aspectHint)
}

function FailedTile({
  aspect,
  retry,
  className,
}: {
  aspect: MediaAspect | undefined
  retry: () => void
  className: string | undefined
}): ReactElement {
  return (
    <div
      className={cn(
        "grid w-full place-items-center rounded-cell bg-(--well)",
        className
      )}
      style={aspectStyle(aspect)}
    >
      <IconButton label={t("state.tryAgain")} tone="quiet" onClick={retry}>
        <RotateCcwIcon aria-hidden="true" />
      </IconButton>
    </div>
  )
}

function VisualTile(props: AssetTileProps & { asset: Asset }): ReactElement {
  const { asset } = props
  const source = useAssetSource(asset.id)
  const viewer = useViewer()
  const client = useQueryClient()
  const aspect = shapedAspect(props, asset)
  const isShapeless = asset.width === null || asset.height === null
  const name = useAssetName(asset) ?? assetLabel(asset)
  if (source.state === "loading") {
    return (
      <Skeleton
        className={cn("w-full", props.className)}
        style={aspectStyle(aspect)}
      />
    )
  }
  if (source.state === "failed") {
    return (
      <FailedTile
        aspect={aspect}
        retry={source.retry}
        className={props.className}
      />
    )
  }
  return (
    <MediaTile
      kind={asset.kind === "video" ? "video" : "image"}
      src={source.src}
      alt={name}
      fit={props.fit ?? "cover"}
      caption={
        props.isDemo === true && props.isBare !== true
          ? t("run.demoCaption")
          : undefined
      }
      length={
        asset.kind === "video" &&
        props.shape !== "square" &&
        props.isBare !== true
          ? assetLength(asset)
          : undefined
      }
      {...(isShapeless
        ? { onShape: (shape: MediaAspect) => keepShape(client, asset, shape) }
        : {})}
      {...(props.isStatic === true
        ? {}
        : {
            onOpen: (origin: HTMLElement) =>
              viewer.open(asset.id, origin, props.list ?? [asset.id]),
          })}
      {...(aspect === undefined ? {} : { aspect })}
      {...(props.className === undefined ? {} : { className: props.className })}
    />
  )
}

function SoundTile({
  asset,
  isDemo,
}: {
  asset: Asset
  isDemo: boolean
}): ReactElement {
  const source = useAssetSource(asset.id)
  const download = useDownloadAsset()
  const name = useAssetName(asset) ?? assetLabel(asset)
  if (source.state !== "ready") {
    return <Skeleton className="h-icon w-full" />
  }
  return (
    <AudioRow
      src={source.src}
      name={name}
      durationSeconds={asset.durationSeconds}
      onDownload={() => void download(asset)}
      {...(isDemo ? { caption: t("run.demoCaption") } : {})}
    />
  )
}

function LoadedTile(props: AssetTileProps & { asset: Asset }): ReactElement {
  const isWordless = props.asset.kind === "audio" || props.asset.kind === "text"
  if (isWordless && props.shape === "square") {
    return (
      <AssetThumb
        asset={props.asset}
        list={props.list ?? [props.asset.id]}
        isDemo={props.isDemo === true}
        isStatic={props.isStatic === true}
      />
    )
  }
  switch (props.asset.kind) {
    case "audio":
      return <SoundTile asset={props.asset} isDemo={props.isDemo === true} />
    case "text":
      return <TextOutput asset={props.asset} />
    default:
      return props.isStatic === true || props.hasMenu === false ? (
        <VisualTile {...props} />
      ) : (
        <AssetContextMenu asset={props.asset}>
          <VisualTile {...props} />
        </AssetContextMenu>
      )
  }
}

export function AssetTile(props: AssetTileProps): ReactElement {
  const asset = useQuery(assetQuery(props.assetId))
  const hint = props.shape === "square" ? square : props.aspectHint
  if (asset.data !== undefined) {
    return <LoadedTile {...props} asset={asset.data.asset} />
  }
  if (asset.isError) {
    return (
      <FailedTile
        aspect={hint}
        retry={() => void asset.refetch()}
        className={props.className}
      />
    )
  }
  return (
    <Skeleton
      className={cn("w-full", props.className)}
      style={aspectStyle(hint)}
    />
  )
}
