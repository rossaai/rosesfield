import { fieldRoleOf, type ModelField } from "@rosesfield/catalog/comfy"
import { Button } from "@rosesfield/ui/components/button"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import type { ReactElement } from "react"
import { bySettingOrder, settingOf } from "@/catalog/setting-registry"
import { t } from "@/copy/t"
import {
  chosenIconOf,
  PopoverChip,
  StepperChip,
  settingIconOf,
  toggleIconOf,
  withOptionIcons,
  withShapes,
} from "@/screens/app/bar/setting-chip"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
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
  const options = field.options.map((option) => ({
    value: String(option),
    label: String(option),
  }))
  return (
    <ChipSelect
      label={fieldCaption(field)}
      icon={
        role === "aspect"
          ? (withShapes([{ value: chosen, label: chosen }])[0]?.icon ??
            settingIconOf(field.name, role))
          : chosenIconOf(field.name, role, chosen)
      }
      value={chosen}
      display={chosen === "" ? t("field.choice.notSet") : chosen}
      onValueChange={(next) =>
        form.setInput(
          field.name,
          field.options.find((one) => String(one) === next)
        )
      }
      options={
        role === "aspect"
          ? withShapes(options)
          : withOptionIcons(field.name, options)
      }
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
  switch (field.kind) {
    case "prompt":
      return null
    case "choice":
      return <FieldChoiceChip field={field} form={form} output={output} />
    case "number": {
      const min = field.min ?? 0
      const chosen = typeof value === "number" ? value : (field.default ?? min)
      return (
        <StepperChip
          label={label}
          icon={icon}
          shown={String(chosen)}
          value={chosen}
          min={min}
          max={field.max ?? min}
          step={1}
          onChange={(next) => form.setInput(field.name, next)}
        />
      )
    }
    case "toggle": {
      const isOn = value === "on"
      return (
        <Button
          size="small"
          tone={isOn ? "default" : "quiet"}
          aria-pressed={isOn}
          onClick={() => form.setInput(field.name, isOn ? "off" : "on")}
        >
          {toggleIconOf(field.name, isOn)}
          {label}
        </Button>
      )
    }
    default:
      return (
        <PopoverChip label={label} icon={icon} shown={shownOf(value)}>
          <HostedFields fields={[field]} form={form} />
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
  return (
    <>
      {[...fields]
        .sort(
          bySettingOrder((field) =>
            settingOf(field.name, fieldRoleOf(field, output))
          )
        )
        .map((field) => (
          <ModelFieldChip
            key={field.name}
            field={field}
            form={form}
            output={output}
          />
        ))}
    </>
  )
}
