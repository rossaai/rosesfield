import type { Asset, Run } from "@rosesfield/contract"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import type { ReactElement, ReactNode } from "react"
import { dayKey, dayLabel } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { SelectableTile } from "@/pieces/selectable-tile"
import { UploadRow } from "@/pieces/upload-row"
import { useLongPress } from "@/pieces/use-long-press"
import type { Upload } from "@/pieces/use-uploads"

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

type LibraryGridProps = {
  assets: readonly Asset[]
  runsById: ReadonlyMap<string, Run>
  working: readonly Run[]
  uploads: readonly Upload[]
  selected: readonly string[] | null
  onToggle: (assetId: string) => void
  onStartSelect: (assetId: string) => void
  isTouch: boolean
  uploadActions: {
    stop: (key: string) => void
    retry: (key: string) => void
    remove: (key: string) => void
  }
}

function PendingTiles(props: LibraryGridProps): ReactNode {
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

function PressTile({
  onLongPress,
  isTouch,
  children,
}: {
  onLongPress: () => void
  isTouch: boolean
  children: ReactNode
}): ReactElement {
  const press = useLongPress(onLongPress)
  return <div {...(isTouch ? press : {})}>{children}</div>
}

export function LibraryGrid(props: LibraryGridProps): ReactElement {
  const ids = props.assets.map((asset) => asset.id)
  const { selected } = props
  return (
    <div className="flex flex-col gap-s6">
      <PendingTiles {...props} />
      {groupByDay(props.assets, new Date()).map((group) => (
        <section key={group.key} className="flex flex-col gap-s3">
          <h2 className="text-body font-medium">{group.label}</h2>
          <MediaGrid>
            {group.assets.map((asset) =>
              selected === null ? (
                <PressTile
                  key={asset.id}
                  onLongPress={() => props.onStartSelect(asset.id)}
                  isTouch={props.isTouch}
                >
                  <AssetTile
                    assetId={asset.id}
                    shape="square"
                    list={ids}
                    hasMenu={!props.isTouch}
                    isDemo={
                      asset.sourceRunId !== null &&
                      props.runsById.get(asset.sourceRunId)?.origin === "demo"
                    }
                  />
                </PressTile>
              ) : (
                <SelectableTile
                  key={asset.id}
                  assetId={asset.id}
                  isSelected={selected.includes(asset.id)}
                  onToggle={() => props.onToggle(asset.id)}
                />
              )
            )}
          </MediaGrid>
        </section>
      ))}
    </div>
  )
}
