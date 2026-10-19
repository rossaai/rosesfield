import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props): ReactElement {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-switch-height w-switch-width shrink-0 items-center rounded-full bg-track p-control-inset data-checked:bg-track-on data-disabled:opacity-(--opacity-disabled)",
        motion.tint,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block h-knob-height w-knob-width rounded-full bg-ink data-checked:bg-canvas data-checked:[transform:translateX(calc(var(--spacing-switch-width)-var(--spacing-knob-width)-2*var(--spacing-control-inset)))]",
          motion.control
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
