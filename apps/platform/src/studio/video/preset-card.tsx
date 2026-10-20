import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rosesfield/ui/components/dialog"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { PreviewSlot } from "@rosesfield/ui/components/preview-slot"
import { StartFrame } from "@rosesfield/ui/components/upload-zone"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { type ReactElement, useState } from "react"
import { t, tCatalog } from "@/copy/t"
import type { ShownPreset } from "@/studio/video/preset-samples"

const tileAspect = { width: 16, height: 9 }

type PresetCardProps = {
  presets: readonly ShownPreset[]
  move: string | null
  onMove: (move: string | null) => void
  line: string
}

function PresetTile({
  label,
  sample,
  isChosen,
  onPick,
}: {
  label: string
  sample: string | null
  isChosen: boolean
  onPick: () => void
}): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={isChosen}
      onClick={onPick}
      className={cn(
        "flex min-w-0 flex-col gap-s1_5 rounded-cell p-s1 text-left outline-none hover:bg-(--tint) focus-visible:outline-2 focus-visible:outline-hor-text aria-pressed:bg-(--tint)",
        motion.tint
      )}
    >
      {sample === null ? (
        <PreviewSlot aspect={tileAspect} label={label} />
      ) : (
        <MediaTile kind="video" src={sample} alt={label} aspect={tileAspect} />
      )}
      <span className="truncate text-label text-ink">{label}</span>
    </button>
  )
}

function PresetGrid({
  presets,
  move,
  onPick,
}: {
  presets: readonly ShownPreset[]
  move: string | null
  onPick: (move: string | null) => void
}): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-s2">
      <PresetTile
        label={tCatalog("video.preset.none")}
        sample={null}
        isChosen={move === null}
        onPick={() => onPick(null)}
      />
      {presets.map((preset) => (
        <PresetTile
          key={preset.value}
          label={tCatalog(preset.labelKey)}
          sample={preset.sample}
          isChosen={move === preset.value}
          onPick={() => onPick(preset.value)}
        />
      ))}
    </div>
  )
}

export function PresetCard({
  presets,
  move,
  onMove,
  line,
}: PresetCardProps): ReactElement | null {
  const [isOpen, setOpen] = useState(false)
  const chosen = presets.find((preset) => preset.value === move) ?? null
  const shown = chosen ?? presets[0] ?? null
  if (shown === null) {
    return null
  }
  const title =
    chosen === null
      ? tCatalog("video.preset.title")
      : tCatalog(chosen.labelKey)
  return (
    <>
      <StartFrame
        src={shown.sample}
        alt={tCatalog(shown.labelKey)}
        title={title}
        line={line}
        changeLabel={tCatalog("video.preset.change")}
        onChange={() => setOpen(true)}
      />
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("viewer.close")}>
          <DialogHeader>
            <DialogTitle>{tCatalog("video.preset.pick")}</DialogTitle>
          </DialogHeader>
          <PresetGrid
            presets={presets}
            move={move}
            onPick={(next) => {
              onMove(next)
              setOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
