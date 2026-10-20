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
import {
  ClockIcon,
  HashIcon,
  MoveIcon,
  ProportionsIcon,
  ScanIcon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { withUnit } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { NumberStepper } from "@/pieces/number-stepper"
import { aspectField, countField } from "@/screens/app/app-form"
import { numberOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputUnit } from "@/screens/app/fields/input-copy"
import { aspectItems } from "@/screens/app/fields/output-fields"
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
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

export function chipIconOf(role: FieldRole | null): ReactNode {
  switch (role) {
    case "aspect":
      return <ProportionsIcon />
    case "resolution":
      return <ScanIcon />
    case "length":
      return <ClockIcon />
    case "count":
      return <HashIcon />
    default:
      return undefined
  }
}

export function inputIconOf(
  app: AppListing,
  input: InputDefinition
): ReactNode {
  return input.name === "cameraMove" ? (
    <MoveIcon />
  ) : (
    chipIconOf(inputRoleOf(input.name, app.output.kind))
  )
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
    <Popover>
      <PopoverTrigger
        render={
          <Chip caption={props.label} icon={props.icon}>
            {props.shown}
          </Chip>
        }
      />
      <PopoverContent side="top" align="start" sideOffset={4}>
        <PopoverTitle>{props.label}</PopoverTitle>
        <NumberStepper {...props} />
      </PopoverContent>
    </Popover>
  )
}

export function chipChoiceText(
  input: Extract<InputDefinition, { type: "choice" }>,
  value: string
): string {
  const option = input.options.find((one) => one.value === value)
  return option === undefined ? "" : tCatalog(option.labelKey)
}

function numberText(app: AppListing, input: InputDefinition, value: number) {
  const unit = inputUnit(app, input)
  return unit === ""
    ? t("bar.field", { field: inputCaption(input), value: withUnit(value, "") })
    : withUnit(value, unit)
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
      return (
        <ChipSelect
          label={inputCaption(input)}
          icon={inputIconOf(app, input)}
          display={chipChoiceText(input, textOf(value) || input.default)}
          value={textOf(value) || input.default}
          onValueChange={set}
          options={input.options.map((option) => ({
            value: option.value,
            label: tCatalog(option.labelKey),
          }))}
        />
      )
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
    case "toggle":
      return (
        <Button
          size="small"
          tone={textOf(value) === "on" ? "default" : "quiet"}
          aria-pressed={textOf(value) === "on"}
          onClick={() => set(textOf(value) === "on" ? "off" : "on")}
        >
          {inputCaption(input)}
        </Button>
      )
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
        options={items}
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
