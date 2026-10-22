import type { Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { PresetTile } from "@rosesfield/ui/components/preset-tile"
import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useNavigate, useRouter } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { runAppName, runModel, runPrice } from "@/pieces/run/run-facts"
import type { Draft } from "@/router-context"

export type ExploreKind = "image" | "video" | "audio"

export type ExploreSource =
  | { kind: "share"; shareId: string; src: string }
  | { kind: "own"; assetId: string }
  | { kind: "showcase"; src: string }

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

export type RecreateTarget =
  | { search: { share: string } }
  | { search: { from: string } }
  | { draft: Draft }

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

function promptOfRun(run: Run): string {
  const app = findCatalogApp(run.appId)
  const input = app === null ? null : promptInputOf(app)
  const value = input === null ? undefined : run.inputs[input.name]
  return typeof value === "string" ? value : ""
}

export function recreateTargetOf(entry: ExploreEntry): RecreateTarget {
  switch (entry.source.kind) {
    case "share":
      return { search: { share: entry.source.shareId } }
    case "own":
      return { search: { from: entry.run.id } }
    case "showcase":
      return {
        draft: {
          prompt: promptOfRun(entry.run),
          assetIds: [],
          characterIds: [],
          inputs: entry.run.inputs,
          aspectRatio: entry.run.aspectRatio,
        },
      }
  }
}

export function useEntrySrc(entry: ExploreEntry): string | null {
  const { source } = entry
  const own = useAssetSource(source.kind === "own" ? source.assetId : "")
  if (source.kind !== "own") {
    return source.src
  }
  return own.state === "ready" ? own.src : null
}

export function useRecreate(): (entry: ExploreEntry) => void {
  const navigate = useNavigate()
  return (entry) => {
    const target = recreateTargetOf(entry)
    const to = { to: "/apps/$appId", params: { appId: entry.run.appId } }
    void navigate(
      "draft" in target
        ? { ...to, state: { draft: target.draft } }
        : { ...to, search: target.search }
    )
  }
}

export function useRecreateHref(entry: ExploreEntry): string {
  const router = useRouter()
  const target = recreateTargetOf(entry)
  return router.buildLocation({
    to: "/apps/$appId",
    params: { appId: entry.run.appId },
    ...("draft" in target ? {} : { search: target.search }),
  }).href
}

export function useViewHref(entry: ExploreEntry): string {
  const router = useRouter()
  const { source } = entry
  switch (source.kind) {
    case "share":
      return router.buildLocation({
        to: "/share/$shareId",
        params: { shareId: source.shareId },
      }).href
    case "own":
      return router.buildLocation({ to: "/", search: { view: source.assetId } })
        .href
    case "showcase":
      return router.buildLocation({
        to: "/apps/$appId",
        params: { appId: entry.run.appId },
      }).href
  }
}

function EntrySkeleton({ aspect }: { aspect: MediaAspect }): ReactElement {
  return (
    <Skeleton
      className="w-full rounded-cell"
      style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
    />
  )
}

type ResultCardProps = {
  entry: VisualEntry
  aspect: MediaAspect
  onOpen: OpenResult
  onMore: (entry: VisualEntry) => void
}

export function ResultCard({
  entry,
  aspect,
  onOpen,
  onMore,
}: ResultCardProps): ReactElement {
  const src = useEntrySrc(entry)
  const recreate = useRecreate()
  if (src === null) {
    return <EntrySkeleton aspect={aspect} />
  }
  const app = runAppName(entry.run)
  return (
    <ResultTile
      kind={entry.kind}
      src={src}
      alt={t("explore.tile.label", { app })}
      aspect={aspect}
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
    />
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
  const recreate = useRecreate()
  if (src === null) {
    return <EntrySkeleton aspect={entry.aspect} />
  }
  return (
    <PresetTile
      name={name}
      href={viewHref}
      viewLabel={t("explore.preset.view", { name })}
      action={{
        label: t("explore.tile.recreate"),
        href: actionHref,
        onSelect: () => recreate(entry),
      }}
      clip={{ src, alt: name }}
      aspect={entry.aspect}
    />
  )
}
