import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

type PreviewSlotProps = {
  aspect: MediaAspect
  label: string
  className?: string
}

function PreviewSlot({
  aspect,
  label,
  className,
}: PreviewSlotProps): ReactElement {
  return (
    <div
      data-slot="preview-slot"
      role="img"
      aria-label={label}
      className={cn("w-full rounded-cell bg-(--well)", className)}
      style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
    />
  )
}

export type { PreviewSlotProps }
export { PreviewSlot }
