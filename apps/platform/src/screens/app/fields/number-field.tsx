import type { InputDefinition } from "@rosesfield/contract"
import { Slider } from "@rosesfield/ui/components/slider"
import { type ReactElement, useEffect, useRef } from "react"
import { withUnit } from "@/copy/format"
import { NumberStepper } from "@/pieces/number-stepper"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import {
  type InputFieldProps,
  numberOf,
} from "@/screens/app/fields/field-props"
import { inputCaption, inputUnit } from "@/screens/app/fields/input-copy"

type NumberInput = Extract<InputDefinition, { type: "number" }>

export const stepperLimit = 10

export function stepCount(input: {
  min: number
  max: number
  step: number
}): number {
  return Math.round((input.max - input.min) / input.step)
}

function SliderControl({
  input,
  value,
  unit,
  onChange,
}: {
  input: NumberInput
  value: number
  unit: string
  onChange: (value: number) => void
}): ReactElement {
  return (
    <div className="flex items-center gap-s3">
      <Slider
        value={value}
        min={input.min}
        max={input.max}
        step={input.step}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? (next[0] ?? value) : next)
        }
        aria-label={inputCaption(input)}
      />
      <span className="shrink-0 text-caption text-ink-muted">
        {withUnit(value, unit)}
      </span>
    </div>
  )
}

export function NumberField(props: InputFieldProps<NumberInput>): ReactElement {
  const { app, input, register } = props
  const first = useRef<HTMLButtonElement>(null)
  const value = numberOf(props.value, input.default)
  const unit = inputUnit(app, input)
  useEffect(() => {
    register(() => first.current?.focus())
  }, [register])
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={null}
      problem={props.problem}
    >
      {stepCount(input) <= stepperLimit ? (
        <NumberStepper
          ref={first}
          value={value}
          min={input.min}
          max={input.max}
          step={input.step}
          unit={unit}
          label={inputCaption(input)}
          onChange={props.onChange}
        />
      ) : (
        <SliderControl
          input={input}
          value={value}
          unit={unit}
          onChange={props.onChange}
        />
      )}
    </FieldFrame>
  )
}
