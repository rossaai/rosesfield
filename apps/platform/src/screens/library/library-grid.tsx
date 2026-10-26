import type { Asset, Run } from "@rosesfield/contract"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { SkeletonMasonry } from "@rosesfield/ui/components/skeleton"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import { type ReactElement, type ReactNode, useEffect } from "react"
import { dayKey, dayLabel } from "@/copy/format"
import { t } from "@/copy/t"
import { UploadRow } from "@/pieces/upload-row"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import type { Upload } from "@/pieces/use-uploads"
import { columnCount } from "@/pieces/view/tile-scale"
import { useAvailableWidth } from "@/screens/library/tile-columns"

type DayGroup = { key: number; label: string; assets: Asset[] }

export function groupByDay(assets: readonly Asset[], now: Date): DayGroup[] {
  const groups: DayGroup[] = []
  for (const asset of assets) {
    const key = dayKey(asset.createdAt)
    const last = groups.at(-1)
    if (last !== undefined && last.key === key) {
      last.assets.push(asset)
    } else {
      groups.push({
        key,
        label: dayLabel(asset.createdAt, now),
        assets: [asset],
      })
    }
  }
  return groups
}

type PendingProps = {
  working: readonly Run[]
  uploads: readonly Upload[]
  uploadActions: {
    stop: (key: string) => void
    retry: (key: string) => void
    remove: (key: string) => void
  }
}

export function PendingTiles(props: PendingProps): ReactNode {
  const pending = props.uploads.filter((upload) => upload.status !== "done")
  if (pending.length === 0 && props.working.length === 0) {
    return null
  }
  return (
    <MediaGrid>
      {pending.map((upload) => (
        <div
          key={upload.key}
          className="flex flex-col justify-end rounded-cell bg-(--well) p-s2"
        >
          <UploadRow
            upload={upload}
            onStop={() => props.uploadActions.stop(upload.key)}
            onRetry={() => props.uploadActions.retry(upload.key)}
            onRemove={() => props.uploadActions.remove(upload.key)}
          />
        </div>
      ))}
      {props.working.flatMap((run) =>
        Array.from({ length: run.count }, (_, index) => (
          <WorkingPulse
            // biome-ignore lint/suspicious/noArrayIndexKey: a working tile's place in its run is its identity
            key={`${run.id}-${index}`}
            label={t("run.working", { index: index + 1, count: run.count })}
          />
        ))
      )}
    </MediaGrid>
  )
}

export function GridSkeleton({ size }: { size: number }): ReactElement {
  const isRegular = useIsRegularWindow()
  const [ref, available] = useAvailableWidth()
  const columns = columnCount(available, size, isRegular)
  return (
    <div ref={ref} data-slot="grid-skeleton" className="w-full">
      <SkeletonMasonry columns={columns} />
    </div>
  )
}

export function PagingSkeleton({
  size,
  isFetching,
  fetchMore,
}: {
  size: number
  isFetching: boolean
  fetchMore: () => void
}): ReactElement {
  useEffect(() => {
    if (!isFetching) {
      fetchMore()
    }
  }, [isFetching, fetchMore])
  return <GridSkeleton size={size} />
}
