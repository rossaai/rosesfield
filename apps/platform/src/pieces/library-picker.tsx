import type { AssetKind } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useInfiniteQuery } from "@tanstack/react-query"
import { type ReactElement, useState } from "react"
import { assetsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import { SelectableTile } from "@/pieces/selectable-tile"

type LibraryPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: AssetKind | null
  max: number
  title: string
  onDone: (assetIds: string[]) => void
}

function PickerGrid({
  kind,
  chosen,
  onToggle,
}: {
  kind: AssetKind | null
  chosen: readonly string[]
  onToggle: (assetId: string) => void
}): ReactElement {
  const assets = useInfiniteQuery(assetsQuery(kind))
  const list = assets.data?.pages.flatMap((page) => page.assets) ?? []
  if (assets.isPending) {
    return (
      <MediaGrid>
        {Array.from({ length: 6 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
          <Skeleton key={index} />
        ))}
      </MediaGrid>
    )
  }
  if (list.length === 0) {
    return (
      <p className="text-body text-ink-muted">
        {t("field.asset.libraryEmpty")}
      </p>
    )
  }
  return (
    <MediaGrid className="max-h-[50dvh] overflow-y-auto">
      {list.map((asset) => (
        <SelectableTile
          key={asset.id}
          assetId={asset.id}
          isSelected={chosen.includes(asset.id)}
          onToggle={() => onToggle(asset.id)}
        />
      ))}
    </MediaGrid>
  )
}

export function LibraryPicker(props: LibraryPickerProps): ReactElement {
  const [chosen, setChosen] = useState<string[]>([])
  const toggle = (assetId: string): void => {
    setChosen((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId].slice(-props.max)
    )
  }
  const done = (): void => {
    props.onDone(chosen)
    setChosen([])
    props.onOpenChange(false)
  }
  return (
    <DialogOrSheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
    >
      {props.open ? (
        <PickerGrid kind={props.kind} chosen={chosen} onToggle={toggle} />
      ) : null}
      <Button tone="primary" className="self-end" onClick={done}>
        {t("field.asset.done")}
      </Button>
    </DialogOrSheet>
  )
}
