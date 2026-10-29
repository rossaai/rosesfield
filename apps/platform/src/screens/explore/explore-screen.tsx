import type { AppListing } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { MediaFeed } from "@rosesfield/ui/components/media-feed"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useNavigate, useRouter } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { useKeyReach } from "@/api/key-reach"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { type PlaceView, useView } from "@/pieces/view/use-view"
import {
  type ExploreEntries,
  showcaseEntries,
  useExploreEntries,
} from "@/screens/explore/explore-entries"
import { ExploreNoMatch, ExploreTop } from "@/screens/explore/explore-head"
import { exploreRows, visualEntries } from "@/screens/explore/explore-rows"
import {
  ExploreBanner,
  ExploreRowView,
  exploreApps,
  type ResultActions,
  SharedFeed,
  ShowcaseFeed,
} from "@/screens/explore/explore-sections"
import { useRecreate, type VisualEntry } from "@/screens/explore/explore-tile"
import {
  appsHoldingWords,
  entriesHoldingWords,
  exploreCellsOf,
} from "@/screens/explore/explore-view"
import { useInAppLinks } from "@/screens/explore/in-app-links"
import { useAvailableWidth } from "@/screens/library/tile-columns"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { isFeedExample, showcaseItems } from "@/showcase/showcase"
import { ResultViewer, useShownResult } from "@/viewer/result-viewer"

const skeletonRatios: readonly string[] = ["9 / 16", "16 / 9", "4 / 5"]
const skeletonCount = 12

function useNeedsKey(): boolean {
  return useKeyReach() === "add"
}

function LoadingFeed({ cellWidth }: { cellWidth: number }): ReactElement {
  return (
    <MediaFeed label={t("explore.shared.title")} cellWidth={cellWidth}>
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

const emptyAppId = "image"

function EmptyExplore(): ReactElement {
  const needsKey = useNeedsKey()
  const openKey = useOpenKeyDialog()
  const navigate = useNavigate()
  const openImage = (): void =>
    void navigate({ to: "/apps/$appId", params: { appId: emptyAppId } })
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
  isSearching,
  cellWidth,
  ...actions
}: ResultActions & {
  results: ExploreEntries
  entries: readonly VisualEntry[]
  isSearching: boolean
  cellWidth: number
}): ReactNode {
  const hasShowcase = showcase.length > 0
  if (results.state === "loading") {
    return <LoadingFeed cellWidth={cellWidth} />
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
    return hasShowcase || isSearching ? null : <EmptyExplore />
  }
  const rows = exploreRows(entries)
  return (
    <>
      {rows.map((row) => (
        <ExploreRowView key={row.key} row={row} {...actions} />
      ))}
      <SharedFeed entries={entries} cellWidth={cellWidth} {...actions} />
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

type ExploreShown = {
  apps: AppListing[]
  showcase: VisualEntry[]
  shared: VisualEntry[]
  isNoMatch: boolean
}

function shownOf(
  view: PlaceView,
  results: ExploreEntries,
  shared: readonly VisualEntry[]
): ExploreShown {
  const words = view.words.trim()
  const apps = appsHoldingWords(exploreApps(), words)
  const shownShowcase = entriesHoldingWords(showcase, words)
  const shownShared = entriesHoldingWords(shared, words)
  const isNoMatch =
    words !== "" &&
    results.state === "ready" &&
    apps.length === 0 &&
    shownShared.length === 0 &&
    !shownShowcase.some((entry) => isFeedExample(entry.run.id))
  return { apps, showcase: shownShowcase, shared: shownShared, isNoMatch }
}

export function ExploreScreen(): ReactElement {
  const root = useInAppLinks<HTMLDivElement>()
  const results = useExploreEntries()
  const view = useView("explore")
  const isRegular = useIsRegularWindow()
  const [measure, available] = useAvailableWidth()
  const cells = exploreCellsOf(available, view.size, isRegular)
  const shared = results.state === "ready" ? visualEntries(results.entries) : []
  const shown = shownOf(view, results, shared)
  const entries = [...shown.showcase, ...shown.shared]
  const viewer = useShownResult()
  const recreate = useRecreate()
  const onMore = useMore((entry) => viewer.show(entry, null))
  return (
    <div ref={root} className="flex min-h-full flex-col px-4 pb-12">
      <ExploreBanner />
      <div
        ref={measure}
        className="mt-6 flex flex-col gap-12 @regular:mt-10 @regular:gap-35"
      >
        <ExploreTop view={view} apps={shown.apps} cardWidth={cells.card} />
        {shown.isNoMatch ? <ExploreNoMatch view={view} /> : null}
        <ShowcaseFeed
          entries={shown.showcase}
          cellWidth={cells.feed}
          onOpen={viewer.show}
          onMore={onMore}
        />
        <ExploreFeeds
          results={results}
          entries={shown.shared}
          isSearching={view.words.trim() !== ""}
          cellWidth={cells.feed}
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
