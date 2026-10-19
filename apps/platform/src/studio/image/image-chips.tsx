import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { Chip } from "@rosesfield/ui/components/chip"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { Input } from "@rosesfield/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { ProportionsIcon, ScanIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { t, tCatalog, tCount } from "@/copy/t"
import { NumberStepper } from "@/pieces/number-stepper"
import { textOf } from "@/screens/app/fields/field-props"
import { aspectItems } from "@/screens/app/fields/output-fields"
import { fieldCaption } from "@/screens/app/hosted/hosted-fields"
import type { AppForm } from "@/screens/app/use-app-form"
import { countBoundsOf, type ImageFields } from "@/studio/image/image-fields"
import { shownInputOf } from "@/studio/image/image-rules"

type NumberField = Extract<ModelField, { kind: "number" }>

type StepperChipProps = {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export function PopoverChip({
  label,
  shown,
  icon,
  children,
}: {
  label: string
  shown: string
  icon?: ReactNode
  children: ReactNode
}): ReactElement {
  return (
    <Popover>
      <PopoverTrigger
        render={<Chip caption={label}>{shown === "" ? label : shown}</Chip>}
      />
      <PopoverContent className="max-w-dialog">
        <PopoverTitle>
          <span className="flex items-center gap-s1_5 [&_svg]:glyph-small">
            {icon}
            {label}
          </span>
        </PopoverTitle>
        {children}
      </PopoverContent>
    </Popover>
  )
}

export function CountChip(props: StepperChipProps): ReactElement {
  return (
    <PopoverChip
      label={t("field.count.label")}
      shown={tCount("bar.count.image", props.value)}
    >
      <NumberStepper
        label={t("field.count.label")}
        value={props.value}
        min={props.min}
        max={props.max}
        step={1}
        unit=""
        onChange={props.onChange}
      />
    </PopoverChip>
  )
}

function SettingFieldChip({
  field,
  form,
  icon,
}: {
  field: ModelField
  form: AppForm
  icon?: ReactNode
}): ReactElement | null {
  const value = form.values.inputs[field.name]
  if (field.kind === "choice") {
    const chosen =
      value === undefined ? String(field.default ?? "") : String(value)
    return (
      <ChipSelect
        label={fieldCaption(field)}
        icon={icon}
        value={chosen}
        display={chosen === "" ? fieldCaption(field) : chosen}
        onValueChange={(next) =>
          form.setInput(
            field.name,
            field.options.find((one) => String(one) === next)
          )
        }
        options={field.options.map((option) => ({
          value: String(option),
          label: String(option),
        }))}
      />
    )
  }
  if (field.kind !== "text") {
    return null
  }
  return (
    <PopoverChip label={fieldCaption(field)} shown={textOf(value)} icon={icon}>
      <Input
        aria-label={fieldCaption(field)}
        value={textOf(value)}
        onChange={(event) => form.setInput(field.name, event.target.value)}
      />
    </PopoverChip>
  )
}

function HostedCountChip({
  field,
  form,
}: {
  field: NumberField
  form: AppForm
}): ReactElement {
  const bounds = countBoundsOf(field, form.values.inputs[field.name])
  return (
    <CountChip
      {...bounds}
      onChange={(count) => form.setInput(field.name, count)}
    />
  )
}

export function HostedSettingChips({
  fields,
  form,
}: {
  fields: ImageFields
  form: AppForm
}): ReactElement {
  return (
    <>
      {fields.aspect === null ? null : (
        <SettingFieldChip
          field={fields.aspect}
          form={form}
          icon={<ProportionsIcon aria-hidden="true" />}
        />
      )}
      {fields.size === null ? null : (
        <SettingFieldChip
          field={fields.size}
          form={form}
          icon={
            /quality/i.test(fields.size.path) ? undefined : (
              <ScanIcon aria-hidden="true" />
            )
          }
        />
      )}
      {fields.count === null ? null : (
        <HostedCountChip field={fields.count} form={form} />
      )}
    </>
  )
}

function choiceText(
  input: Extract<InputDefinition, { type: "choice" }>,
  value: string
): string {
  const option = input.options.find((one) => one.value === value)
  return option === undefined ? value : tCatalog(option.labelKey)
}

function GraphResolutionChip({
  app,
  form,
}: {
  app: AppListing
  form: AppForm
}): ReactElement | null {
  const input = app.inputs.find((one) => one.name === "resolution")
  const shown =
    input === undefined ? null : shownInputOf(app, form.values.inputs, input)
  if (shown?.type !== "choice") {
    return null
  }
  const value = textOf(form.values.inputs[shown.name]) || shown.default
  return (
    <ChipSelect
      label={tCatalog(shown.labelKey)}
      icon={<ScanIcon aria-hidden="true" />}
      value={value}
      display={choiceText(shown, value)}
      onValueChange={(next) => form.setInput(shown.name, next)}
      options={shown.options.map((option) => ({
        value: option.value,
        label: tCatalog(option.labelKey),
      }))}
    />
  )
}

export function GraphSettingChips({
  app,
  form,
}: {
  app: AppListing
  form: AppForm
}): ReactElement {
  const aspects = aspectItems(app)
  return (
    <>
      {aspects.length < 2 ? null : (
        <ChipSelect
          label={t("field.aspect.label")}
          icon={<ProportionsIcon aria-hidden="true" />}
          value={form.values.aspectRatio ?? aspects[0]?.value ?? ""}
          onValueChange={(aspectRatio) => form.setForm({ aspectRatio })}
          options={aspects}
        />
      )}
      <GraphResolutionChip app={app} form={form} />
      {app.output.count.max < 2 ? null : (
        <CountChip
          value={form.values.count}
          min={1}
          max={app.output.count.max}
          onChange={(count) => form.setForm({ count })}
        />
      )}
    </>
  )
}
