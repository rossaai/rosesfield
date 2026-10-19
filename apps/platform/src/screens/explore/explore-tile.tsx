import type { Run } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { Link } from "@tanstack/react-router"
import { RepeatIcon, Share2Icon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { AudioRow } from "@/pieces/audio-row"
import { useRunEstimate } from "@/pieces/run/run-estimate"
import { runAppName, runModel, runPrice } from "@/pieces/run/run-facts"
import { ShareDialog } from "@/screens/explore/share-dialog"

export type ExploreKind = "image" | "video" | "audio"

export type ExploreSource =
  | { kind: "share"; shareId: string; src: string; poster: string | null }
  | { kind: "own"; assetId: string }

export type ExploreEntry = {
  key: string
  run: Run
  kind: ExploreKind
  aspect: MediaAspect | undefined
  source: ExploreSource
}

export function exploreCaption(run: Run, estimate: number | null): string {
  return joinParts([
    runAppName(run),
    runModel(run, findCatalogApp(run.appId)),
    runPrice(run, estimate),
  ])
}

function RecreateLink({ entry }: { entry: ExploreEntry }): ReactElement {
  const { run, source } = entry
  const search =
    source.kind === "share" ? { share: source.shareId } : { from: run.id }
  return (
    <IconButton
      label={t("explore.tile.recreate")}
      tone="quiet"
      size="small"
      className="material"
      nativeButton={false}
      render={
        <Link to="/apps/$appId" params={{ appId: run.appId }} search={search} />
      }
    >
      <RepeatIcon aria-hidden="true" />
    </IconButton>
  )
}

function ShareButton({ entry }: { entry: ExploreEntry }): ReactNode {
  const [isOpen, setOpen] = useState(false)
  const { source } = entry
  if (source.kind !== "own") {
    return null
  }
  return (
    <>
      <IconButton
        label={t("explore.tile.share")}
        tone="quiet"
        size="small"
        className="material"
        onClick={() => setOpen(true)}
      >
        <Share2Icon aria-hidden="true" />
      </IconButton>
      <ShareDialog
        run={entry.run}
        outputId={source.assetId}
        open={isOpen}
        onOpenChange={setOpen}
      />
    </>
  )
}

function TileMedia({
  entry,
  src,
  poster,
}: {
  entry: ExploreEntry
  src: string
  poster: string | null
}): ReactElement {
  const label = t("explore.tile.label", { app: runAppName(entry.run) })
  if (entry.kind === "audio") {
    return <AudioRow src={src} name={label} durationSeconds={null} />
  }
  return (
    <MediaTile
      kind={entry.kind}
      src={src}
      alt={label}
      {...(poster === null ? {} : { poster })}
      {...(entry.aspect === undefined ? {} : { aspect: entry.aspect })}
    />
  )
}

function OwnMedia({
  entry,
  assetId,
}: {
  entry: ExploreEntry
  assetId: string
}): ReactElement {
  const source = useAssetSource(assetId)
  if (source.state !== "ready") {
    return (
      <Skeleton
        className="w-full rounded-cell"
        style={{
          aspectRatio: `${entry.aspect?.width ?? 1} / ${entry.aspect?.height ?? 1}`,
        }}
      />
    )
  }
  return <TileMedia entry={entry} src={source.src} poster={null} />
}

export function ExploreTile({ entry }: { entry: ExploreEntry }): ReactElement {
  const estimate = useRunEstimate(entry.run)
  const { source } = entry
  return (
    <article className="flex flex-col gap-s1_5">
      <div className="group relative">
        {source.kind === "own" ? (
          <OwnMedia entry={entry} assetId={source.assetId} />
        ) : (
          <TileMedia entry={entry} src={source.src} poster={source.poster} />
        )}
        <div
          className={cn(
            "absolute top-s2 right-s2 flex gap-s1_5",
            "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
          )}
        >
          <RecreateLink entry={entry} />
          <ShareButton entry={entry} />
        </div>
      </div>
      <p className="line-clamp-2 text-caption text-ink-muted">
        {exploreCaption(entry.run, estimate)}
      </p>
    </article>
  )
}
