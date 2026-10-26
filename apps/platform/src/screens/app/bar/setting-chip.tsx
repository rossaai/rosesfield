import { type FieldRole, inputRoleOf } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Chip } from "@rosesfield/ui/components/chip"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { CountStepper } from "@rosesfield/ui/components/count-stepper"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { SlidersHorizontalIcon, Volume2Icon, VolumeXIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import {
  chosenIconOf,
  settingIconOf,
  withOptionIcons,
  withShapes,
} from "@/catalog/setting-registry"
import { withUnit } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { NumberStepper } from "@/pieces/number-stepper"
import { aspectField, countField } from "@/screens/app/app-form"
import { numberOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputUnit } from "@/screens/app/fields/input-copy"
import { aspectItems } from "@/screens/app/fields/output-fields"
import { booleanPairOf, controlOf } from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"

type SettingChipProps = {
  app: AppListing
  form: AppForm
  name: string
}

type StepperChipProps = {
  label: string
  shown: string
  icon?: ReactNode
  value: number
  fallback?: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}

export function chipIconOf(role: FieldRole | null): ReactElement {
  return settingIconOf("", role)
}

export function toggleIconOf(name: string, isOn: boolean): ReactNode {
  if (/sound/i.test(name)) {
    return isOn ? <Volume2Icon /> : <VolumeXIcon />
  }
  return settingIconOf(name, null)
}

export function inputIconOf(
  app: AppListing,
  input: InputDefinition
): ReactNode {
  return settingIconOf(input.name, inputRoleOf(input.name, app.output.kind))
}

export function CountChip({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}): ReactElement {
  return (
    <CountStepper
      value={value}
      min={min}
      max={max}
      onValueChange={onChange}
      label={t("field.count.label")}
      lessLabel={t("bar.count.less")}
      moreLabel={t("bar.count.more")}
    />
  )
}

export function StepperChip(props: StepperChipProps): ReactElement {
  if (props.label === t("field.count.label") && props.step === 1) {
    return (
      <CountChip
        value={props.value}
        min={props.min}
        max={props.max}
        onChange={props.onChange}
      />
    )
  }
  return (
    <PopoverChip label={props.label} icon={props.icon} shown={props.shown}>
      <NumberStepper
        value={props.value}
        fallback={props.fallback ?? props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        unit={props.unit ?? ""}
        label={props.label}
        icon={props.icon ?? settingIconOf("", null)}
        onChange={props.onChange}
      />
    </PopoverChip>
  )
}

export function PopoverChip(props: {
  label: string
  icon: ReactNode
  shown: string
  children: ReactNode
}): ReactElement {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Chip caption={props.label} icon={props.icon}>
            {props.shown}
          </Chip>
        }
      />
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        motion="none"
        className="w-83.5 max-w-none gap-3 px-4.25 py-4"
      >
        <PopoverTitle className="text-label">{props.label}</PopoverTitle>
        {props.children}
      </PopoverContent>
    </Popover>
  )
}

export function SwitchChip(props: {
  label: string
  name: string
  isOn: boolean
  onToggle: () => void
}): ReactElement {
  return (
    <Button
      size="small"
      tone={props.isOn ? "default" : "quiet"}
      aria-pressed={props.isOn}
      onClick={props.onToggle}
    >
      {toggleIconOf(props.name, props.isOn)}
      {props.label}
    </Button>
  )
}

export function AdvancedChip({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <PopoverChip
      label={t("field.advanced")}
      icon={<SlidersHorizontalIcon />}
      shown={t("field.advanced")}
    >
      <div className="flex flex-col gap-s4">{children}</div>
    </PopoverChip>
  )
}

export function chipChoiceText(
  input: Extract<InputDefinition, { type: "choice" }>,
  value: string
): string {
  const option = input.options.find((one) => one.value === value)
  return option === undefined ? "" : tCatalog(option.labelKey)
}

export function namedChoiceText(
  app: AppListing,
  input: Extract<InputDefinition, { type: "choice" }>,
  value: string
): string {
  const shown = chipChoiceText(input, value)
  return inputIconOf(app, input) === undefined
    ? t("bar.field", { field: inputCaption(input), value: shown })
    : shown
}

function numberText(app: AppListing, input: InputDefinition, value: number) {
  const unit = inputUnit(app, input)
  return unit === ""
    ? t("bar.field", { field: inputCaption(input), value: withUnit(value, "") })
    : withUnit(value, unit)
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function ChoiceChip({
  app,
  form,
  input,
}: {
  app: AppListing
  form: AppForm
  input: ChoiceInput
}): ReactElement {
  const set = (next: string): void => form.setInput(input.name, next)
  const chosen = textOf(form.values.inputs[input.name]) || input.default
  const options = input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
  const pair =
    controlOf({ kind: "choice", options }) === "switch"
      ? booleanPairOf(options)
      : null
  if (pair !== null) {
    return (
      <SwitchChip
        label={inputCaption(input)}
        name={input.name}
        isOn={chosen === pair.on}
        onToggle={() => set(chosen === pair.on ? pair.off : pair.on)}
      />
    )
  }
  return (
    <ChipSelect
      label={inputCaption(input)}
      icon={chosenIconOf(
        input.name,
        inputRoleOf(input.name, app.output.kind),
        chosen
      )}
      display={namedChoiceText(app, input, chosen)}
      value={chosen}
      onValueChange={set}
      options={withOptionIcons(input.name, options)}
    />
  )
}

function InputChip({
  app,
  form,
  input,
}: {
  app: AppListing
  form: AppForm
  input: InputDefinition
}): ReactElement | null {
  const value = form.values.inputs[input.name]
  const set = (next: string | number): void => form.setInput(input.name, next)
  switch (input.type) {
    case "choice":
      return <ChoiceChip app={app} form={form} input={input} />
    case "number":
      return (
        <StepperChip
          label={inputCaption(input)}
          icon={inputIconOf(app, input)}
          shown={numberText(app, input, numberOf(value, input.default))}
          value={numberOf(value, input.default)}
          min={input.min}
          max={input.max}
          step={input.step}
          unit={inputUnit(app, input)}
          onChange={set}
        />
      )
    case "toggle": {
      const isOn = (textOf(value) || input.default) === "on"
      return (
        <SwitchChip
          label={inputCaption(input)}
          name={input.name}
          isOn={isOn}
          onToggle={() => set(isOn ? "off" : "on")}
        />
      )
    }
    default:
      return null
  }
}

export function SettingChip({
  app,
  form,
  name,
}: SettingChipProps): ReactElement | null {
  if (name === aspectField) {
    const items = aspectItems(app)
    return items.length < 2 ? null : (
      <ChipSelect
        label={t("field.aspect.label")}
        icon={chipIconOf("aspect")}
        value={form.values.aspectRatio ?? items[0]?.value ?? ""}
        onValueChange={(aspectRatio) => form.setForm({ aspectRatio })}
        options={withShapes(items)}
      />
    )
  }
  if (name === countField) {
    const max = app.output.count.max
    return max < 2 ? null : (
      <CountChip
        value={form.values.count}
        min={1}
        max={max}
        onChange={(count) => form.setForm({ count })}
      />
    )
  }
  const input = app.inputs.find((one) => one.name === name)
  return input === undefined ? null : (
    <InputChip app={app} form={form} input={input} />
  )
}

export { withOptionIcons, withShapes }
