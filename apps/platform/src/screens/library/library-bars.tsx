import type { Asset } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Input } from "@rosesfield/ui/components/input"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, useState } from "react"
import { t, tCount } from "@/copy/t"
import { useDownloadAsset } from "@/pieces/asset-actions"
import { DeleteAssetDialog } from "@/pieces/delete-asset-dialog"

export type LibraryKind = "all" | "image" | "video" | "audio"

const kindItems: SegmentedItem<LibraryKind>[] = [
  { value: "all", label: t("kind.all") },
  { value: "image", label: t("kind.image") },
  { value: "video", label: t("kind.video") },
  { value: "audio", label: t("kind.audio") },
]

type FiltersProps = {
  kind: LibraryKind
  query: string
  isSearchOpen: boolean
  onKind: (kind: LibraryKind) => void
  onQuery: (query: string) => void
}

export function LibraryFilters(props: FiltersProps): ReactElement {
  return (
    <div className="flex flex-col gap-s3 @regular:flex-row @regular:items-center">
      <SegmentedControl
        items={kindItems}
        value={props.kind}
        onValueChange={props.onKind}
        label={t("library.kind.label")}
      />
      <Input
        type="search"
        aria-label={t("library.search.label")}
        placeholder={t("library.search.placeholder")}
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        className={cn(
          "max-w-none @regular:flex @regular:max-w-field-max",
          props.isSearchOpen ? "" : "hidden"
        )}
      />
    </div>
  )
}

type SelectionBarProps = {
  selected: readonly string[]
  assets: readonly Asset[]
  onCancel: () => void
}

export function SelectionBar({
  selected,
  assets,
  onCancel,
}: SelectionBarProps): ReactElement {
  const download = useDownloadAsset()
  const [isConfirming, setConfirming] = useState(false)
  const chosen = assets.filter((asset) => selected.includes(asset.id))
  const count = selected.length
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-s2 bg-canvas py-s3 @regular:static @regular:py-0">
      <p className="min-w-0 flex-1 text-body font-medium">
        {tCount("library.selected", count)}
      </p>
      <Button
        disabled={count === 0}
        onClick={() => void Promise.all(chosen.map(download))}
      >
        {t("library.selection.download")}
      </Button>
      <Button
        tone="danger"
        disabled={count === 0}
        onClick={() => setConfirming(true)}
      >
        {t("library.selection.delete")}
      </Button>
      <Button tone="quiet" onClick={onCancel}>
        {t("library.selection.cancel")}
      </Button>
      <DeleteAssetDialog
        assetIds={selected}
        open={isConfirming}
        onOpenChange={setConfirming}
        onDeleted={onCancel}
        title={tCount("library.delete.title", count)}
        body={t("library.delete.body")}
      />
    </div>
  )
}
