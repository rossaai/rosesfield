import { Button } from "@rosesfield/ui/components/button"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useState } from "react"
import { settingsQuery } from "@/api/queries"
import { useHasVisitorKey } from "@/api/visitor-keys"
import { t } from "@/copy/t"
import {
  type ExploreFilter,
  filterEntries,
  useExploreEntries,
} from "@/screens/explore/explore-entries"
import { ExploreTile } from "@/screens/explore/explore-tile"
import { HomeComposer } from "@/screens/home/home-composer"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { ScreenHeader } from "@/shell/screen-header"

const filters: SegmentedItem<ExploreFilter>[] = [
  { value: "all", label: t("kind.all") },
  { value: "image", label: t("kind.image") },
  { value: "video", label: t("kind.video") },
  { value: "audio", label: t("kind.audio") },
]

const skeletonRatios: readonly string[] = ["1 / 1", "9 / 16", "16 / 9", "4 / 5"]

function useNeedsKey(): boolean {
  const settings = useQuery(settingsQuery).data
  const hasKey = useHasVisitorKey("engine")
  return settings?.mode === "public" && !hasKey
}

function AddKey(): ReactNode {
  const needsKey = useNeedsKey()
  const openKey = useOpenKeyDialog()
  if (!needsKey) {
    return null
  }
  return (
    <Button tone="primary" onClick={openKey}>
      {t("key.add")}
    </Button>
  )
}

function LoadingGrid(): ReactElement {
  return (
    <MediaGrid layout="masonry">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
          key={index}
          className="w-full rounded-cell"
          style={{ aspectRatio: skeletonRatios[index % skeletonRatios.length] }}
        />
      ))}
    </MediaGrid>
  )
}

function EmptyExplore(): ReactElement {
  const needsKey = useNeedsKey()
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t("explore.empty.title")}
      body={t("explore.empty.body")}
      {...(needsKey
        ? {}
        : {
            actions: (
              <Button
                tone="primary"
                nativeButton={false}
                render={<Link to="/apps/$appId" params={{ appId: "image" }} />}
              >
                {t("explore.empty.action")}
              </Button>
            ),
          })}
    />
  )
}

function ExploreGrid({ filter }: { filter: ExploreFilter }): ReactElement {
  const results = useExploreEntries()
  if (results.state === "loading") {
    return <LoadingGrid />
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
  const entries = filterEntries(results.entries, filter)
  if (entries.length === 0) {
    return <EmptyExplore />
  }
  return (
    <MediaGrid layout="masonry">
      {entries.map((entry) => (
        <ExploreTile key={entry.key} entry={entry} />
      ))}
    </MediaGrid>
  )
}

export function ExploreScreen(): ReactElement {
  const [filter, setFilter] = useState<ExploreFilter>("all")
  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader
        title={t("explore.title")}
        phoneTitle={t("shell.name")}
        actions={<AddKey />}
        phoneAction={<AddKey />}
      />
      <div className="flex flex-col gap-s4 px-s5 pb-s12 @regular:px-s4">
        <div className="flex justify-center pt-s3 @regular:pt-s8">
          <HomeComposer className="w-full max-w-prompt-max" />
        </div>
        <div className="overflow-x-auto">
          <SegmentedControl
            items={filters}
            value={filter}
            onValueChange={setFilter}
            label={t("explore.kind.label")}
          />
        </div>
        <ExploreGrid filter={filter} />
      </div>
    </div>
  )
}
