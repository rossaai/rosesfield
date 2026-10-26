import type { InputDefinition } from "@rosesfield/contract"
import { fieldInset } from "@rosesfield/ui/components/input"
import { Switch } from "@rosesfield/ui/components/switch"
import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, useId } from "react"
import { settingTipOf } from "@/catalog/setting-registry"
import { SettingHint } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"

type ToggleInput = Extract<InputDefinition, { type: "toggle" }>

type SwitchRowProps = {
  label: string
  hint?: string | null | undefined
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function SwitchRow(props: SwitchRowProps): ReactElement {
  const id = useId()
  return (
    <div
      data-slot="switch-row"
      className={cn(
        "flex min-h-button items-center justify-between gap-s3",
        fieldInset
      )}
    >
      <span className="flex min-w-0 items-center gap-s1_5">
        <label htmlFor={id} className="text-label text-ink-muted">
          {props.label}
        </label>
        <SettingHint setting={props.label} text={props.hint} />
      </span>
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
      hint={settingTipOf(props.input.name)}
      checked={isOn}
      onCheckedChange={(checked) => props.onChange(checked ? "on" : "off")}
    />
  )
}
