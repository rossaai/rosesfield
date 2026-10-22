import type { Asset, Run } from "@rosesfield/contract"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"
import { formatTime } from "@/copy/format"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { runAppName } from "@/pieces/run/run-facts"
import { RunHeadline } from "@/pieces/run/run-headline"
import { groupByDay } from "@/screens/library/library-grid"
import { stepOf, thumbSteps } from "@/screens/library/tile-columns"

type LibraryRowsProps = {
  size: number
  assets: readonly Asset[]
  runsById: ReadonlyMap<string, Run>
}

function LibraryRow({
  asset,
  run,
  list,
  thumb,
}: {
  asset: Asset
  run: Run | undefined
  list: readonly string[]
  thumb: string
}): ReactElement {
  return (
    <li className="flex items-center gap-s3 border-b border-(--line) py-s3">
      <span className={cn("shrink-0", thumb)}>
        <AssetTile
          assetId={asset.id}
          shape="square"
          list={list}
          isDemo={false}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-s1">
        <span className="truncate text-label text-ink-muted">
          {run === undefined ? t("library.upload") : runAppName(run)}
        </span>
        {run === undefined ? null : (
          <span className="truncate text-body">
            <RunHeadline run={run} />
          </span>
        )}
        <span className="text-caption text-ink-muted">
          {formatTime(asset.createdAt)}
        </span>
      </span>
    </li>
  )
}

export function LibraryRows(props: LibraryRowsProps): ReactElement {
  const list = props.assets.map((asset) => asset.id)
  const thumb = stepOf(thumbSteps, props.size)
  return (
    <div data-slot="library-list" className="flex w-full flex-col">
      {groupByDay(props.assets, new Date()).map((group) => (
        <section key={group.key} className="flex flex-col">
          <h2 className="pt-s4 text-body font-medium">{group.label}</h2>
          <ul>
            {group.assets.map((asset) => (
              <LibraryRow
                key={asset.id}
                asset={asset}
                run={
                  asset.sourceRunId === null
                    ? undefined
                    : props.runsById.get(asset.sourceRunId)
                }
                list={list}
                thumb={thumb}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
