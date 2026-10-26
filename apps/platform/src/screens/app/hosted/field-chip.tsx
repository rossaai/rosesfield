import { fieldRoleOf, type ModelField } from "@rosesfield/catalog/comfy"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import type { ReactElement } from "react"
import { settingIconOf, withChoiceIcons } from "@/catalog/setting-registry"
import { t } from "@/copy/t"
import {
  AdvancedChip,
  PopoverChip,
  StepperChip,
  SwitchChip,
} from "@/screens/app/bar/setting-chip"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import { HostedField } from "@/screens/app/hosted/hosted-fields"
import {
  booleanPairOf,
  controlOf,
  fieldOptionsOf,
  fieldSettingsPlan,
  fieldShapeOf,
  fieldValueText,
} from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"

type ChoiceField = Extract<ModelField, { kind: "choice" }>

export function FieldChoiceChip({
  field,
  form,
  output = "image",
}: {
  field: ChoiceField
  form: AppForm
  output?: string
}): ReactElement {
  const value = form.values.inputs[field.name]
  const chosen =
    value === undefined ? String(field.default ?? "") : String(value)
  const role = fieldRoleOf(field, output)
  const options = fieldOptionsOf(field)
  const pair =
    controlOf({ kind: "choice", options }) === "switch"
      ? booleanPairOf(options)
      : null
  const choose = (next: string): void =>
    form.setInput(
      field.name,
      field.options.find((one) => String(one) === next)
    )
  if (pair !== null) {
    return (
      <SwitchChip
        label={fieldCaption(field)}
        name={field.name}
        isOn={chosen === pair.on}
        onToggle={() => choose(chosen === pair.on ? pair.off : pair.on)}
      />
    )
  }
  const items = withChoiceIcons(field.name, role, options)
  const isOption = items.some((one) => one.value === chosen)
  return (
    <ChipSelect
      label={fieldCaption(field)}
      icon={
        items.find((one) => one.value === chosen)?.icon ??
        settingIconOf(field.name, role)
      }
      value={chosen}
      display={
        isOption ? fieldValueText(field, chosen) : t("field.choice.notSet")
      }
      onValueChange={choose}
      options={items}
    />
  )
}

function shownOf(value: unknown): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value
  }
  if (typeof value === "number") {
    return String(value)
  }
  if (Array.isArray(value) && value.length > 0) {
    return String(value.length)
  }
  return t("field.choice.notSet")
}

export function ModelFieldChip({
  field,
  form,
  output,
}: {
  field: ModelField
  form: AppForm
  output: string
}): ReactElement | null {
  const value = form.values.inputs[field.name]
  const label = fieldCaption(field)
  const icon = settingIconOf(field.name, fieldRoleOf(field, output))
  switch (controlOf(fieldShapeOf(field))) {
    case "select":
    case "switch":
      if (field.kind === "choice") {
        return <FieldChoiceChip field={field} form={form} output={output} />
      }
      if (field.kind === "toggle") {
        const isOn = value === "on"
        return (
          <SwitchChip
            label={label}
            name={field.name}
            isOn={isOn}
            onToggle={() => form.setInput(field.name, isOn ? "off" : "on")}
          />
        )
      }
      return null
    case "stepper": {
      if (field.kind !== "number") {
        return null
      }
      const min = field.min ?? 0
      const fallback = field.default ?? min
      const chosen = typeof value === "number" ? value : fallback
      return (
        <StepperChip
          label={label}
          icon={icon}
          shown={fieldValueText(field, chosen)}
          value={chosen}
          fallback={fallback}
          min={min}
          max={field.max ?? Number.POSITIVE_INFINITY}
          step={field.step ?? (field.integer ? 1 : 0.1)}
          onChange={(next) => form.setInput(field.name, next)}
        />
      )
    }
    default:
      return field.kind === "prompt" ? null : (
        <PopoverChip label={label} icon={icon} shown={shownOf(value)}>
          <HostedField field={field} value={value} form={form} />
        </PopoverChip>
      )
  }
}

export function ModelFieldChips({
  fields,
  form,
  output,
}: {
  fields: readonly ModelField[]
  form: AppForm
  output: string
}): ReactElement {
  const plan = fieldSettingsPlan(fields)
  return (
    <>
      {plan.main.map((field) => (
        <ModelFieldChip
          key={field.name}
          field={field}
          form={form}
          output={output}
        />
      ))}
      {plan.advanced.length === 0 ? null : (
        <AdvancedChip>
          {plan.advanced.map((field) => (
            <HostedField
              key={field.name}
              field={field}
              value={form.values.inputs[field.name]}
              form={form}
            />
          ))}
        </AdvancedChip>
      )}
    </>
  )
}
