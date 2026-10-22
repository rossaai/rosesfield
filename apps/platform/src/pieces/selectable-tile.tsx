import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CheckIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"

export const chosenVeilClass = cn(
  "pointer-events-none absolute inset-0 z-10 rounded-cell ring-2 ring-transparent ring-inset data-[chosen=yes]:bg-selection data-[chosen=yes]:ring-ink",
  motion.tint
)

export function ChosenVeil({ isChosen }: { isChosen: boolean }): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-slot="chosen-veil"
      data-chosen={isChosen ? "yes" : "no"}
      className={chosenVeilClass}
    />
  )
}

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
    <div data-slot="selectable-tile" className="relative">
      <AssetTile assetId={assetId} shape="square" />
      <ChosenVeil isChosen={isSelected} />
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={t("library.tile.select")}
        onClick={onToggle}
        className={cn("absolute inset-0 z-20 rounded-cell", interaction.ring)}
      >
        <span
          aria-hidden="true"
          data-slot="selectable-tile-check"
          className={cn(
            "absolute top-s2 left-s2 flex size-checkbox items-center justify-center rounded-dense text-canvas shadow-float",
            isSelected ? "bg-ink" : "material-thin border border-surface-2",
            motion.tint
          )}
        >
          {isSelected ? <CheckIcon className="glyph-small" /> : null}
        </span>
      </button>
    </div>
  )
}
