import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CheckIcon } from "lucide-react"
import type { ReactElement } from "react"

function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props): ReactElement {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "relative flex size-checkbox shrink-0 items-center justify-center rounded-dense bg-track text-canvas data-checked:bg-ink data-disabled:opacity-(--opacity-disabled)",
        motion.pressRound,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn("flex", motion.enter)}
      >
        <CheckIcon aria-hidden="true" className="glyph-small" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
