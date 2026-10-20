import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

type SettingSliderProps = {
  label: string
  shown: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

const middle = 0.5

export function valueSideOf(
  value: number,
  min: number,
  max: number
): "start" | "end" {
  const share = max > min ? (value - min) / (max - min) : 0
  return share < middle ? "end" : "start"
}

export function SettingSlider(props: SettingSliderProps): ReactElement {
  const side = valueSideOf(props.value, props.min, props.max)
  return (
    <SliderPrimitive.Root
      data-slot="setting-slider"
      value={props.value}
      min={props.min}
      max={props.max}
      step={props.step}
      thumbAlignment="edge"
      onValueChange={(next) =>
        props.onChange(typeof next === "number" ? next : (next[0] ?? props.min))
      }
      className="w-full"
    >
      <SliderPrimitive.Control className="relative flex h-9 w-full touch-none items-center select-none">
        <SliderPrimitive.Track className="relative h-9 w-full overflow-hidden rounded-dense bg-(--well)">
          <SliderPrimitive.Indicator className="h-full bg-(--tint)" />
          <span
            aria-hidden="true"
            data-slot="setting-slider-value"
            data-side={side}
            className={cn(
              "pointer-events-none absolute inset-y-0 flex items-center font-medium text-body text-ink",
              side === "start" ? "left-3" : "right-3"
            )}
          >
            {props.shown}
          </span>
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={props.label}
          className={cn(
            "block h-9 w-1 rounded-full bg-ink",
            interaction.thumbRing
          )}
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
