import { Button } from "@rosesfield/ui/components/button"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { PreviewSlot } from "@rosesfield/ui/components/preview-slot"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { MoveIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { tCatalog } from "@/copy/t"
import type { ShownPreset } from "@/studio/video/preset-samples"

const tileAspect = { width: 16, height: 9 }

type PresetCardProps = {
  presets: readonly ShownPreset[]
  move: string | null
  onMove: (move: string | null) => void
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
}: PresetCardProps): ReactElement | null {
  const [isOpen, setOpen] = useState(false)
  if (presets.length === 0) {
    return null
  }
  const chosen = presets.find((preset) => preset.value === move) ?? null
  return (
    <section
      aria-label={tCatalog("video.preset.title")}
      className="flex items-center gap-s3 rounded-card bg-(--well) p-s2"
    >
      <div className="w-tile shrink-0">
        {chosen === null ? (
          <PreviewSlot
            aspect={tileAspect}
            label={tCatalog("video.preset.none")}
            className="bg-(--tint)"
          />
        ) : (
          <MediaTile
            kind="video"
            src={chosen.sample}
            alt={tCatalog(chosen.labelKey)}
            aspect={tileAspect}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-s1">
        <span className="text-label text-ink-muted">
          {tCatalog("video.preset.title")}
        </span>
        <span className="truncate font-medium text-body text-ink">
          {chosen === null
            ? tCatalog("video.preset.none")
            : tCatalog(chosen.labelKey)}
        </span>
      </div>
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button size="small">
              <MoveIcon aria-hidden="true" />
              {tCatalog("video.preset.change")}
            </Button>
          }
        />
        <PopoverContent className="w-dialog max-w-[min(var(--spacing-dialog),calc(100vw-2*var(--spacing-s4)))]">
          <PopoverTitle>{tCatalog("video.preset.pick")}</PopoverTitle>
          <PresetGrid
            presets={presets}
            move={move}
            onPick={(next) => {
              onMove(next)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </section>
  )
}
