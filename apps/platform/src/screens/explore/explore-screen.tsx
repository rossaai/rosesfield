import { Button } from "@rosesfield/ui/components/button"
import { MediaFeed } from "@rosesfield/ui/components/media-feed"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useNavigate, useRouter } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { useKeyReach } from "@/api/key-reach"
import { t } from "@/copy/t"
import {
  type ExploreEntries,
  showcaseEntries,
  useExploreEntries,
} from "@/screens/explore/explore-entries"
import { exploreRows, visualEntries } from "@/screens/explore/explore-rows"
import {
  AppsRow,
  bannerAppId,
  ExploreBanner,
  ExploreRowView,
  type ResultActions,
  SharedFeed,
  ShowcaseFeed,
} from "@/screens/explore/explore-sections"
import { useRecreate, type VisualEntry } from "@/screens/explore/explore-tile"
import { useInAppLinks } from "@/screens/explore/in-app-links"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { showcaseItems } from "@/showcase/showcase"
import { ResultViewer, useShownResult } from "@/viewer/result-viewer"

const skeletonRatios: readonly string[] = ["9 / 16", "16 / 9", "4 / 5"]
const skeletonCount = 12

function useNeedsKey(): boolean {
  return useKeyReach() === "add"
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
      {rows.map((row) => (
        <ExploreRowView key={row.key} row={row} {...actions} />
      ))}
      <SharedFeed entries={entries} {...actions} />
    </>
  )
}

function useMore(
  view: (entry: VisualEntry) => void
): (entry: VisualEntry) => void {
  const router = useRouter()
  return (entry) => {
    const { source } = entry
    switch (source.kind) {
      case "own":
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
  const onMore = useMore((entry) => viewer.show(entry, null))
  return (
    <div ref={root} className="flex min-h-full flex-col px-4 pb-12">
      <ExploreBanner />
      <div className="mt-6 flex flex-col gap-12 @regular:mt-10 @regular:gap-35">
        <AppsRow />
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
    </div>
  )
}
