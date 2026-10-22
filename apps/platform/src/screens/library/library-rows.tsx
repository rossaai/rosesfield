import type { Asset, Run } from "@rosesfield/contract"
import { cn } from "@rosesfield/ui/lib/cn"
import { UploadIcon } from "lucide-react"
import type { ReactElement } from "react"
import { formatTime } from "@/copy/format"
import { t } from "@/copy/t"
import { assetLabel } from "@/pieces/asset-name"
import { AssetTile } from "@/pieces/asset-tile"
import { runAppName } from "@/pieces/run/run-facts"
import {
  lineOf,
  listRowClass,
  RowLead,
  RowWords,
  rowThumb,
} from "@/screens/history/history-row"
import { groupByDay } from "@/screens/library/library-grid"
import { SelectMark } from "@/screens/library/result-grid"

type LibraryRowsProps = {
  assets: readonly Asset[]
  runsById: ReadonlyMap<string, Run>
  selected?: readonly string[] | null
  onToggle?: (assetId: string) => void
}

function UploadLead(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="flex size-4 shrink-0 items-center justify-center text-ink-muted [&_svg]:size-4"
    >
      <UploadIcon />
    </span>
  )
}

function LibraryRow({
  asset,
  run,
  list,
  selection,
}: {
  asset: Asset
  run: Run | undefined
  list: readonly string[]
  selection: { isSelected: boolean; onToggle: () => void } | null
}): ReactElement {
  return (
    <li data-slot="library-row" className={listRowClass}>
      <span className={cn("shrink-0", rowThumb)}>
        <AssetTile
          assetId={asset.id}
          shape="square"
          list={list}
          isDemo={false}
        />
      </span>
      {run === undefined ? <UploadLead /> : <RowLead run={run} />}
      <RowWords
        name={run === undefined ? t("library.upload") : runAppName(run)}
        line={run === undefined ? assetLabel(asset) : lineOf(run)}
        time={formatTime(asset.createdAt)}
      />
      {selection === null ? null : (
        <SelectMark
          isSelected={selection.isSelected}
          onToggle={selection.onToggle}
        />
      )}
    </li>
  )
}

export function LibraryRows(props: LibraryRowsProps): ReactElement {
  const list = props.assets.map((asset) => asset.id)
  const selected = props.selected ?? null
  return (
    <div data-slot="library-list" className="flex w-full flex-col">
      {groupByDay(props.assets, new Date()).map((group) => (
        <section key={group.key} className="flex flex-col">
          <h2 className="flex h-tab items-center font-medium text-label text-ink-muted">
            {group.label}
          </h2>
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
                selection={
                  selected === null || props.onToggle === undefined
                    ? null
                    : {
                        isSelected: selected.includes(asset.id),
                        onToggle: () => props.onToggle?.(asset.id),
                      }
                }
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
