import type { InputDefinition } from "@rosesfield/contract"
import { Switch } from "@rosesfield/ui/components/switch"
import { type ReactElement, useId } from "react"
import { type InputFieldProps, textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"

type ToggleInput = Extract<InputDefinition, { type: "toggle" }>

type SwitchRowProps = {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function SwitchRow(props: SwitchRowProps): ReactElement {
  const id = useId()
  return (
    <div
      data-slot="switch-row"
      className="flex min-h-button items-center justify-between gap-s3"
    >
      <label htmlFor={id} className="text-label text-ink-muted">
        {props.label}
      </label>
      <Switch
        id={id}
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}
      />
    </div>
  )
}

export function ToggleField(props: InputFieldProps<ToggleInput>): ReactElement {
  const isOn = (textOf(props.value) || props.input.default) === "on"
  return (
    <SwitchRow
      label={inputCaption(props.input)}
      checked={isOn}
      onCheckedChange={(checked) => props.onChange(checked ? "on" : "off")}
    />
  )
}
