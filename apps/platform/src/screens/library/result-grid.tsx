import type { Asset, Run } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Volume2Icon, VolumeOffIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useRef, useState } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { AssetContextMenu } from "@/pieces/asset-context-menu"
import { assetLabel, useAssetName } from "@/pieces/asset-name"
import { AssetTile, aspectOfAsset } from "@/pieces/asset-tile"
import { runAppName, runAspect, runModel } from "@/pieces/run/run-facts"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import {
  columnLayout,
  packColumns,
  tileStepOf,
  useAvailableWidth,
} from "@/screens/library/tile-columns"
import { useViewer } from "@/viewer/viewer-context"

export type GridItem = {
  assetId: string
  run: Run | null
  aspect: MediaAspect
}

const square: MediaAspect = { width: 1, height: 1 }

export function gridItemOf(asset: Asset, run: Run | null): GridItem {
  const hint = run === null ? square : runAspect(run)
  return {
    assetId: asset.id,
    run,
    aspect: aspectOfAsset(asset, hint) ?? hint,
  }
}

export function SoundButton(): ReactElement {
  const [isOn, setOn] = useState(false)
  const Icon = isOn ? Volume2Icon : VolumeOffIcon
  return (
    <IconButton
      label={t(isOn ? "output.soundOff" : "output.soundOn")}
      place="clip"
      tone="glass"
      aria-pressed={isOn}
      onClick={(event) => {
        const video = event.currentTarget
          .closest("[data-slot='grid-item']")
          ?.querySelector("video")
        if (video !== null && video !== undefined) {
          video.muted = isOn
          setOn(!isOn)
        }
      }}
    >
      <Icon aria-hidden="true" />
    </IconButton>
  )
}

function openMenuAt(node: HTMLElement | null): void {
  if (node === null) {
    return
  }
  const box = node.getBoundingClientRect()
  node.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: box.right,
      clientY: box.top,
    })
  )
}

function RunResult({
  asset,
  run,
  aspect,
  src,
  list,
}: {
  asset: Asset
  run: Run
  aspect: MediaAspect
  src: string
  list: readonly string[]
}): ReactElement {
  const viewer = useViewer()
  const navigate = useNavigate()
  const holder = useRef<HTMLDivElement>(null)
  const name = useAssetName(asset) ?? assetLabel(asset)
  const isVideo = asset.kind === "video"
  return (
    <AssetContextMenu asset={asset}>
      <div ref={holder} data-slot="grid-item" className="w-full">
        <ResultTile
          kind={isVideo ? "video" : "image"}
          src={src}
          alt={name}
          aspect={aspectOfAsset(asset, aspect) ?? aspect}
          app={runAppName(run)}
          model={runModel(run, findCatalogApp(run.appId)) ?? ""}
          openLabel={t("library.tile.open", { name })}
          expandLabel={t("library.tile.expand")}
          moreLabel={t("viewer.more")}
          recreateLabel={t("run.useInputs")}
          recreateName={t("library.tile.recreateName", { name })}
          onOpen={(origin) => viewer.open(asset.id, origin, list)}
          onRecreate={() =>
            void navigate({
              to: "/apps/$appId",
              params: { appId: run.appId },
              search: { from: run.id },
            })
          }
          onMore={() => openMenuAt(holder.current)}
          form="library"
          narrow={false}
          {...(isVideo ? { sound: <SoundButton /> } : {})}
        />
      </div>
    </AssetContextMenu>
  )
}

function OwnTile({
  item,
  list,
  isVideo,
}: {
  item: GridItem
  list: readonly string[]
  isVideo: boolean
}): ReactElement {
  return (
    <div data-slot="grid-item" className="relative w-full">
      <AssetTile
        assetId={item.assetId}
        list={list}
        aspectHint={item.aspect}
        isDemo={item.run?.origin === "demo"}
      />
      {isVideo ? (
        <span className="absolute right-2 bottom-2 z-20 flex">
          <SoundButton />
        </span>
      ) : null}
    </div>
  )
}

function RunTile({
  item,
  run,
  asset,
  list,
}: {
  item: GridItem
  run: Run
  asset: Asset
  list: readonly string[]
}): ReactElement {
  const source = useAssetSource(asset.id)
  if (source.state !== "ready") {
    return <OwnTile item={item} list={list} isVideo={asset.kind === "video"} />
  }
  return (
    <RunResult
      asset={asset}
      run={run}
      aspect={item.aspect}
      src={source.src}
      list={list}
    />
  )
}

export function GridTile({
  item,
  list,
}: {
  item: GridItem
  list: readonly string[]
}): ReactElement {
  const asset = useQuery(assetQuery(item.assetId)).data?.asset
  const kind = asset?.kind
  const isVisual = kind === "image" || kind === "video"
  if (asset !== undefined && item.run !== null && isVisual) {
    return <RunTile item={item} run={item.run} asset={asset} list={list} />
  }
  return <OwnTile item={item} list={list} isVideo={kind === "video"} />
}

export function ResultGrid({
  items,
  size,
  after,
}: {
  items: readonly GridItem[]
  size: number
  after?: ReactNode
}): ReactElement {
  const isRegular = useIsRegularWindow()
  const [ref, available] = useAvailableWidth()
  const step = tileStepOf(size, isRegular)
  const layout = columnLayout(items.length, available, step, isRegular)
  const columns = packColumns(items, layout.count, (item) => item.aspect)
  const list = items.map((item) => item.assetId)
  return (
    <div ref={ref} data-slot="result-grid" className="flex w-full flex-col">
      <div
        data-fills={layout.fills ? "" : undefined}
        className="flex w-full items-start justify-start gap-2"
      >
        {columns.map((column, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a column's place is its identity
            key={index}
            data-slot="result-column"
            className={cn(
              "flex min-w-0 flex-col gap-2",
              layout.fills ? "flex-1" : cn("shrink-0", step.className)
            )}
          >
            {column.map((item) => (
              <GridTile key={item.assetId} item={item} list={list} />
            ))}
          </div>
        ))}
      </div>
      {after}
    </div>
  )
}
