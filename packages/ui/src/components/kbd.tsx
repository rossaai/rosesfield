import { cn } from "@rosesfield/ui/lib/cn"
import type { ComponentProps, ReactElement } from "react"

function Kbd({ className, ...props }: ComponentProps<"kbd">): ReactElement {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex min-w-s5 shrink-0 items-center justify-center rounded-dense bg-(--tint) px-s1 font-sans text-caption text-ink-muted",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({
  className,
  ...props
}: ComponentProps<"kbd">): ReactElement {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex shrink-0 items-center gap-s1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
