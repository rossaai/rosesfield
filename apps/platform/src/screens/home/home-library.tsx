import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { assetsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { useGridColumns } from "@/pieces/use-columns"
import { useWorkingRuns } from "@/shell/use-working-runs"

type Tile = { key: string; node: ReactNode }

function workingTiles(runs: readonly Run[]): Tile[] {
  return runs.flatMap((run) =>
    Array.from({ length: run.count }, (_, index) => ({
      key: `${run.id}-${index}`,
      node: (
        <WorkingPulse
          label={t("run.working", { index: index + 1, count: run.count })}
        />
      ),
    }))
  )
}

export function useHomeIsEmpty(): boolean {
  const assets = useInfiniteQuery(assetsQuery(null))
  const working = useWorkingRuns()
  const count = assets.data?.pages[0]?.assets.length ?? 0
  return assets.isSuccess && count === 0 && working.length === 0
}

function SkeletonGrid({ count }: { count: number }): ReactElement {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
        <Skeleton key={index} />
      ))}
    </>
  )
}

function LibraryTiles(): ReactNode {
  const assets = useInfiniteQuery(assetsQuery(null))
  const working = useWorkingRuns()
  const [gridRef, columns] = useGridColumns()
  if (assets.isError) {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={t("home.failed.title")}
        actions={
          <Button onClick={() => void assets.refetch()}>
            {t("state.tryAgain")}
          </Button>
        }
      />
    )
  }
  const ids =
    assets.data?.pages.flatMap((page) =>
      page.assets.map((asset) => asset.id)
    ) ?? []
  const tiles: Tile[] = [
    ...workingTiles(working),
    ...ids.map((id) => ({
      key: id,
      node: <AssetTile assetId={id} shape="square" list={ids} />,
    })),
  ].slice(0, columns * 2)
  return (
    <MediaGrid ref={gridRef}>
      {assets.isPending ? (
        <SkeletonGrid count={columns * 2} />
      ) : (
        tiles.map((tile) => <div key={tile.key}>{tile.node}</div>)
      )}
    </MediaGrid>
  )
}

export function HomeLibrary(): ReactElement {
  return (
    <section className="flex w-full max-w-prompt-max flex-col gap-s3">
      <div className="flex items-center justify-between gap-s2">
        <h2 className="text-body font-medium">{t("home.library.title")}</h2>
        <Button
          tone="quiet"
          size="small"
          render={<Link to="/library" />}
          nativeButton={false}
        >
          {t("home.library.open")}
        </Button>
      </div>
      <LibraryTiles />
    </section>
  )
}
