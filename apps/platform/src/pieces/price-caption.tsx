import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

type PriceCaptionProps = {
  text: string | null
  slot: string
  wraps?: boolean
}

export function PriceCaption({
  text,
  slot,
  wraps = false,
}: PriceCaptionProps): ReactElement | null {
  return text === null || text === "" ? null : (
    <p
      data-slot={slot}
      className={cn(
        "min-w-0 text-caption text-ink-muted tabular-nums",
        wraps ? "" : "truncate"
      )}
    >
      {text}
    </p>
  )
}
