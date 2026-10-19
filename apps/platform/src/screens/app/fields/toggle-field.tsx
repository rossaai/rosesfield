import type { InputDefinition } from "@rosesfield/contract"
import { Switch } from "@rosesfield/ui/components/switch"
import { type ReactElement, useId } from "react"
import { type InputFieldProps, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"

type ToggleInput = Extract<InputDefinition, { type: "toggle" }>

export function ToggleField(props: InputFieldProps<ToggleInput>): ReactElement {
  const id = useId()
  const isOn = (textOf(props.value) || props.input.default) === "on"
  const note = inputNote(props.app, props.input)
  return (
    <div className="flex flex-col gap-s1_5">
      <div className="flex items-center justify-between gap-s3">
        <label htmlFor={id} className="text-label text-ink-muted">
          {inputCaption(props.input)}
        </label>
        <Switch
          id={id}
          checked={isOn}
          onCheckedChange={(checked) => props.onChange(checked ? "on" : "off")}
        />
      </div>
      {note === null ? null : (
        <p className="text-label text-ink-muted">{note}</p>
      )}
    </div>
  )
}
