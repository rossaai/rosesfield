import { Button } from "@rosesfield/ui/components/button"
import { MediaFeed } from "@rosesfield/ui/components/media-feed"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useState } from "react"
import { settingsQuery } from "@/api/queries"
import { useHasVisitorKey } from "@/api/visitor-keys"
import { t } from "@/copy/t"
import {
  type ExploreEntries,
  showcaseEntries,
  useExploreEntries,
} from "@/screens/explore/explore-entries"
import { exploreRows, visualEntries } from "@/screens/explore/explore-rows"
import {
  AppTiles,
  bannerAppId,
  ExploreBanner,
  ExploreRowView,
  PromoCards,
  type ResultActions,
  SharedFeed,
  ShowcaseFeed,
} from "@/screens/explore/explore-sections"
import { useRecreate, type VisualEntry } from "@/screens/explore/explore-tile"
import { useInAppLinks } from "@/screens/explore/in-app-links"
import { ShareDialog } from "@/screens/explore/share-dialog"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { showcaseItems } from "@/showcase/showcase"
import { ResultViewer, useShownResult } from "@/viewer/result-viewer"

const skeletonRatios: readonly string[] = ["9 / 16", "16 / 9", "4 / 5"]
const skeletonCount = 12

function useNeedsKey(): boolean {
  const settings = useQuery(settingsQuery).data
  const hasKey = useHasVisitorKey("engine")
  return settings?.mode === "public" && !hasKey
}

function LoadingFeed(): ReactElement {
  return (
    <MediaFeed label={t("explore.shared.title")}>
      {Array.from({ length: skeletonCount }, (_, index) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
          key={index}
          className="w-full rounded-cell"
          style={{ aspectRatio: skeletonRatios[index % skeletonRatios.length] }}
        />
      ))}
    </MediaFeed>
  )
}

function EmptyExplore(): ReactElement {
  const needsKey = useNeedsKey()
  const openKey = useOpenKeyDialog()
  const navigate = useNavigate()
  const openImage = (): void =>
    void navigate({ to: "/apps/$appId", params: { appId: bannerAppId } })
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t("explore.empty.title")}
      body={t("explore.empty.body")}
      actions={
        needsKey ? (
          <Button tone="primary" onClick={openKey}>
            {t("key.add")}
          </Button>
        ) : (
          <Button tone="primary" onClick={openImage}>
            {t("explore.empty.action")}
          </Button>
        )
      }
    />
  )
}

const showcase = showcaseEntries(showcaseItems)

function ExploreFeeds({
  results,
  entries,
  ...actions
}: ResultActions & {
  results: ExploreEntries
  entries: readonly VisualEntry[]
}): ReactNode {
  const hasShowcase = showcase.length > 0
  if (results.state === "loading") {
    return <LoadingFeed />
  }
  if (results.state === "failed") {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={t("explore.failed.title")}
        actions={<Button onClick={results.retry}>{t("state.tryAgain")}</Button>}
      />
    )
  }
  if (entries.length === 0) {
    return hasShowcase ? null : <EmptyExplore />
  }
  const rows = exploreRows(entries)
  return (
    <>
      {rows.map((row, index) => (
        <ExploreRowView
          key={row.key}
          row={row}
          isLead={index === 0 && !hasShowcase}
          {...actions}
        />
      ))}
      <SharedFeed
        entries={entries}
        isLead={rows.length === 0 && !hasShowcase}
        {...actions}
      />
    </>
  )
}

function ShareLayer({
  entry,
  onClose,
}: {
  entry: VisualEntry | null
  onClose: () => void
}): ReactNode {
  if (entry === null || entry.source.kind !== "own") {
    return null
  }
  return (
    <ShareDialog
      run={entry.run}
      outputId={entry.source.assetId}
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    />
  )
}

function useMore(
  share: (entry: VisualEntry) => void,
  view: (entry: VisualEntry) => void
): (entry: VisualEntry) => void {
  const router = useRouter()
  return (entry) => {
    const { source } = entry
    switch (source.kind) {
      case "own":
        share(entry)
        return
      case "showcase":
        view(entry)
        return
      case "share":
        router.history.push(
          router.buildLocation({
            to: "/share/$shareId",
            params: { shareId: source.shareId },
          }).href
        )
    }
  }
}

export function ExploreScreen(): ReactElement {
  const root = useInAppLinks<HTMLDivElement>()
  const results = useExploreEntries()
  const shared = results.state === "ready" ? visualEntries(results.entries) : []
  const entries = [...showcase, ...shared]
  const viewer = useShownResult()
  const recreate = useRecreate()
  const [sharing, setSharing] = useState<VisualEntry | null>(null)
  const onMore = useMore(setSharing, (entry) => viewer.show(entry, null))
  return (
    <div ref={root} className="flex min-h-full flex-col px-4 pb-12">
      <ExploreBanner />
      <PromoCards entries={entries} isLoading={results.state === "loading"} />
      <AppTiles />
      <div className="mt-6 flex flex-col gap-12 @regular:mt-10 @regular:gap-35">
        <ShowcaseFeed entries={showcase} onOpen={viewer.show} onMore={onMore} />
        <ExploreFeeds
          results={results}
          entries={shared}
          onOpen={viewer.show}
          onMore={onMore}
        />
      </div>
      <ResultViewer
        shown={viewer.shown}
        open={viewer.isOpen}
        list={entries}
        onClose={viewer.close}
        onStep={viewer.step}
        onRecreate={recreate}
      />
      <ShareLayer entry={sharing} onClose={() => setSharing(null)} />
    </div>
  )
}
