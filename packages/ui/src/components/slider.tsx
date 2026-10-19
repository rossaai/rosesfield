import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

function Slider({
  className,
  ...props
}: SliderPrimitive.Root.Props): ReactElement {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "w-full max-w-field-max data-disabled:opacity-(--opacity-disabled)",
        className
      )}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-knob-height w-full touch-none items-center select-none">
        <SliderPrimitive.Track className="relative h-track w-full rounded-full bg-track">
          <SliderPrimitive.Indicator className="h-full rounded-full bg-ink" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-knob-height w-knob-width rounded-full bg-ink" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
