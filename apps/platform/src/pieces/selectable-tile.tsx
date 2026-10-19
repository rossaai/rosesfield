import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CheckIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"

type SelectableTileProps = {
  assetId: string
  isSelected: boolean
  onToggle: () => void
}

export function SelectableTile({
  assetId,
  isSelected,
  onToggle,
}: SelectableTileProps): ReactElement {
  return (
    <div className="relative">
      <AssetTile assetId={assetId} shape="square" />
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={t("library.tile.select")}
        onClick={onToggle}
        className={cn(
          "absolute inset-0 rounded-cell aria-pressed:bg-selection",
          motion.tint
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-s2 left-s2 flex size-checkbox items-center justify-center rounded-dense text-canvas",
            isSelected ? "bg-ink" : "bg-track"
          )}
        >
          {isSelected ? <CheckIcon className="glyph-small" /> : null}
        </span>
      </button>
    </div>
  )
}
