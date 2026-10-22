import { fieldRoleOf, type ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import type { ReactElement } from "react"
import { t, tCount } from "@/copy/t"
import { aspectField, countField } from "@/screens/app/app-form"
import {
  chipIconOf,
  SettingChip,
  StepperChip,
  withShapes,
} from "@/screens/app/bar/setting-chip"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import type { AppForm } from "@/screens/app/use-app-form"
import { countBoundsOf, type ImageFields } from "@/studio/image/image-fields"
import { shownInputOf } from "@/studio/image/image-rules"

type ChoiceField = Extract<ModelField, { kind: "choice" }>
type NumberField = Extract<ModelField, { kind: "number" }>

export function FieldChoiceChip({
  field,
  form,
}: {
  field: ChoiceField
  form: AppForm
}): ReactElement {
  const value = form.values.inputs[field.name]
  const chosen =
    value === undefined ? String(field.default ?? "") : String(value)
  const role = fieldRoleOf(field, "image")
  const options = field.options.map((option) => ({
    value: String(option),
    label: String(option),
  }))
  return (
    <ChipSelect
      label={fieldCaption(field)}
      icon={chipIconOf(role)}
      value={chosen}
      display={chosen === "" ? t("field.choice.notSet") : chosen}
      onValueChange={(next) =>
        form.setInput(
          field.name,
          field.options.find((one) => String(one) === next)
        )
      }
      options={role === "aspect" ? withShapes(options) : options}
    />
  )
}

function FieldCountChip({
  field,
  form,
}: {
  field: NumberField
  form: AppForm
}): ReactElement {
  const bounds = countBoundsOf(field, form.values.inputs[field.name])
  return (
    <StepperChip
      {...bounds}
      label={t("field.count.label")}
      icon={chipIconOf("count")}
      shown={tCount("bar.count.image", bounds.value)}
      step={1}
      onChange={(count) => form.setInput(field.name, count)}
    />
  )
}

export function HostedSettingChips({
  app,
  fields,
  form,
}: {
  app: AppListing
  fields: ImageFields
  form: AppForm
}): ReactElement {
  return (
    <>
      {fields.aspect === null ? null : (
        <FieldChoiceChip field={fields.aspect} form={form} />
      )}
      {fields.quality === null ? null : (
        <FieldChoiceChip field={fields.quality} form={form} />
      )}
      {fields.resolution === null ? null : (
        <FieldChoiceChip field={fields.resolution} form={form} />
      )}
      {fields.count === null ? null : (
        <FieldCountChip field={fields.count} form={form} />
      )}
      {fields.isOneAtATime ? (
        <SettingChip app={app} form={form} name={countField} />
      ) : null}
    </>
  )
}

function withShownResolution(app: AppListing, form: AppForm): AppListing {
  return {
    ...app,
    inputs: app.inputs.flatMap((input) => {
      if (input.name !== "resolution") {
        return [input]
      }
      const shown = shownInputOf(app, form.values.inputs, input)
      return shown === null ? [] : [shown]
    }),
  }
}

export function GraphSettingChips({
  app,
  form,
}: {
  app: AppListing
  form: AppForm
}): ReactElement {
  const shown = withShownResolution(app, form)
  return (
    <>
      {[aspectField, "resolution", countField].map((name) => (
        <SettingChip key={name} app={shown} form={form} name={name} />
      ))}
    </>
  )
}
