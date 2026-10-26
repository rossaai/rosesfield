import type { InputDefinition } from "@rosesfield/contract"
import { type ReactElement, useEffect, useRef } from "react"
import { settingIconOf } from "@/catalog/setting-registry"
import { NumberStepper } from "@/pieces/number-stepper"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import {
  type InputFieldProps,
  numberOf,
} from "@/screens/app/fields/field-props"
import { inputCaption, inputUnit } from "@/screens/app/fields/input-copy"

type NumberInput = Extract<InputDefinition, { type: "number" }>

export function NumberField(props: InputFieldProps<NumberInput>): ReactElement {
  const { app, input, register } = props
  const first = useRef<HTMLInputElement>(null)
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
      <NumberStepper
        ref={first}
        value={numberOf(props.value, input.default)}
        fallback={input.default}
        min={input.min}
        max={input.max}
        step={input.step}
        unit={inputUnit(app, input)}
        label={inputCaption(input)}
        icon={settingIconOf(input.name, null)}
        onChange={props.onChange}
      />
    </FieldFrame>
  )
}
