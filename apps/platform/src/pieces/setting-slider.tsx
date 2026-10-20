import { Slider as SliderPrimitive } from "@base-ui/react/slider"
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

export function SettingSlider(props: SettingSliderProps): ReactElement {
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
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-medium text-body text-ink"
          >
            {props.shown}
          </span>
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={props.label}
          className="block h-9 w-1 rounded-full bg-ink"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
