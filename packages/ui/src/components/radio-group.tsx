import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"

function RadioGroup({
  className,
  ...props
}: RadioGroupPrimitive.Props): ReactElement {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-col gap-s3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: RadioPrimitive.Root.Props): ReactElement {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "relative flex size-checkbox shrink-0 items-center justify-center rounded-full bg-track data-checked:bg-ink data-disabled:opacity-(--opacity-disabled)",
        motion.pressRound,
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className={cn("size-radio-dot rounded-full bg-canvas", motion.enter)}
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
