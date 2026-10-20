import type { Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { PresetTile } from "@rosesfield/ui/components/preset-tile"
import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { useNavigate, useRouter } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { runAppName, runModel, runPrice } from "@/pieces/run/run-facts"

export type ExploreKind = "image" | "video" | "audio"

export type ExploreSource =
  | { kind: "share"; shareId: string; src: string }
  | { kind: "own"; assetId: string }

export type ExploreEntry = {
  key: string
  run: Run
  kind: ExploreKind
  aspect: MediaAspect | undefined
  source: ExploreSource
}

export type VisualEntry = ExploreEntry & {
  kind: "image" | "video"
  aspect: MediaAspect
}

export type RecreateSearch = { share: string } | { from: string }

export type OpenResult = (entry: VisualEntry, origin: HTMLElement) => void

export function exploreCaption(run: Run, estimate: number | null): string {
  return joinParts([
    runAppName(run),
    runModel(run, findCatalogApp(run.appId)),
    runPrice(run, estimate),
  ])
}

export function entryModel(entry: ExploreEntry): string | null {
  return runModel(entry.run, findCatalogApp(entry.run.appId))
}

export function recreateSearchOf(entry: ExploreEntry): RecreateSearch {
  return entry.source.kind === "share"
    ? { share: entry.source.shareId }
    : { from: entry.run.id }
}

export function useEntrySrc(entry: ExploreEntry): string | null {
  const { source } = entry
  const own = useAssetSource(source.kind === "own" ? source.assetId : "")
  if (source.kind === "share") {
    return source.src
  }
  return own.state === "ready" ? own.src : null
}

export function useRecreate(): (entry: ExploreEntry) => void {
  const navigate = useNavigate()
  return (entry) =>
    void navigate({
      to: "/apps/$appId",
      params: { appId: entry.run.appId },
      search: recreateSearchOf(entry),
    })
}

export function useRecreateHref(entry: ExploreEntry): string {
  const router = useRouter()
  return router.buildLocation({
    to: "/apps/$appId",
    params: { appId: entry.run.appId },
    search: recreateSearchOf(entry),
  }).href
}

export function useViewHref(entry: ExploreEntry): string {
  const router = useRouter()
  const { source } = entry
  return source.kind === "share"
    ? router.buildLocation({
        to: "/share/$shareId",
        params: { shareId: source.shareId },
      }).href
    : router.buildLocation({ to: "/", search: { view: source.assetId } }).href
}

function EntrySkeleton({ aspect }: { aspect: MediaAspect }): ReactElement {
  return (
    <Skeleton
      className="w-full rounded-cell"
      style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
    />
  )
}

const machineMadePlace = {
  bottom: "bottom-2 left-2",
  top: "top-2 left-2",
} as const

export function MachineMade({
  place,
  children,
}: {
  place: keyof typeof machineMadePlace
  children: ReactNode
}): ReactElement {
  return (
    <div data-slot="machine-made" className="relative w-full">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute z-20 rounded-dense bg-scrim px-2 font-medium text-caption text-ink",
          machineMadePlace[place]
        )}
      >
        {t("explore.tile.machineMade")}
      </span>
    </div>
  )
}

type ResultCardProps = {
  entry: VisualEntry
  narrow: boolean
  onOpen: OpenResult
  onMore: (entry: VisualEntry) => void
}

export function ResultCard({
  entry,
  narrow,
  onOpen,
  onMore,
}: ResultCardProps): ReactElement {
  const src = useEntrySrc(entry)
  const recreate = useRecreate()
  if (src === null) {
    return <EntrySkeleton aspect={entry.aspect} />
  }
  const app = runAppName(entry.run)
  return (
    <MachineMade place="bottom">
      <ResultTile
        kind={entry.kind}
        src={src}
        alt={t("explore.tile.label", { app })}
        aspect={entry.aspect}
        app={app}
        model={entryModel(entry) ?? t("explore.tile.noModel")}
        openLabel={t("explore.tile.open", { app })}
        expandLabel={t("explore.tile.expand", { app })}
        moreLabel={t("explore.tile.more", { app })}
        recreateLabel={t("explore.tile.recreate")}
        recreateName={t("explore.tile.recreateName")}
        onOpen={(origin) => onOpen(entry, origin)}
        onRecreate={() => recreate(entry)}
        onMore={() => onMore(entry)}
        narrow={narrow}
      />
    </MachineMade>
  )
}

export function ExplorePresetTile({
  name,
  entry,
}: {
  name: string
  entry: VisualEntry
}): ReactElement {
  const src = useEntrySrc(entry)
  const viewHref = useViewHref(entry)
  const actionHref = useRecreateHref(entry)
  if (src === null) {
    return <EntrySkeleton aspect={entry.aspect} />
  }
  return (
    <MachineMade place="top">
      <PresetTile
        name={name}
        href={viewHref}
        viewLabel={t("explore.preset.view", { name })}
        action={{ label: t("explore.tile.recreate"), href: actionHref }}
        clip={{ src, alt: name }}
        aspect={entry.aspect}
      />
    </MachineMade>
  )
}
