import { fieldRoleOf, type ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { Input } from "@rosesfield/ui/components/input"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, type ReactNode, useId, useState } from "react"
import { promptInputOf } from "@/catalog/app-facts"
import { settingIconOf } from "@/catalog/setting-registry"
import { t } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { NumberStepper } from "@/pieces/number-stepper"
import type { FieldValue } from "@/screens/app/app-form"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { promptPlaceholderOf } from "@/screens/app/fields/input-copy"
import { AdvancedSection } from "@/screens/app/fields/setting-rows"
import { SwitchRow } from "@/screens/app/fields/toggle-field"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import {
  controlOf,
  fieldOptionsOf,
  fieldSettingsPlan,
  fieldShapeOf,
  fieldValueText,
  isSettingField,
} from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"

type HostedFieldsProps = {
  fields: readonly ModelField[]
  form: AppForm
  skip?: readonly ModelField["kind"][]
  app?: AppListing
  model?: ReactNode
}

type FieldProps = {
  field: ModelField
  value: FieldValue
  form: AppForm
  placeholder?: string
}

const choiceOutput = "image"

export function isShownField(field: ModelField): boolean {
  return !(field.kind === "choice" && field.options.length === 1)
}

function Frame({
  field,
  form,
  children,
}: FieldProps & { children: ReactNode }): ReactElement {
  return (
    <FieldFrame
      caption={fieldCaption(field)}
      isOptional={false}
      note={null}
      problem={form.problems.get(field.name)}
    >
      {children}
    </FieldFrame>
  )
}

function textDefaultOf(field: ModelField): string | null {
  return field.kind === "text" && field.default !== null && field.default !== ""
    ? field.default
    : null
}

function TextControl(props: FieldProps): ReactElement {
  const { field, value, form } = props
  const id = useId()
  const onChange = (next: string): void => form.setInput(field.name, next)
  const shared = {
    id,
    "aria-label": fieldCaption(field),
    value: textOf(value),
    placeholder:
      props.placeholder ?? textDefaultOf(field) ?? t("field.text.placeholder"),
  }
  return (
    <Frame {...props}>
      {field.kind === "prompt" ? (
        <Textarea
          {...shared}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input {...shared} onChange={(event) => onChange(event.target.value)} />
      )}
    </Frame>
  )
}

function SeedControl(props: FieldProps): ReactElement {
  const { field, value, form } = props
  return (
    <Frame {...props}>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={fieldCaption(field)}
        value={typeof value === "number" ? String(value) : ""}
        {...(field.kind === "number" && field.default !== null
          ? { placeholder: String(field.default) }
          : {})}
        step={1}
        onChange={(event) => {
          const next =
            event.target.value === "" ? undefined : Number(event.target.value)
          form.setInput(field.name, next)
        }}
      />
    </Frame>
  )
}

function StepperControl(props: FieldProps): ReactElement | null {
  const { field, value, form } = props
  if (field.kind !== "number") {
    return null
  }
  const min = field.min ?? Number.NEGATIVE_INFINITY
  const max = field.max ?? Number.POSITIVE_INFINITY
  const fallback = field.default ?? field.min ?? 0
  const shown = typeof value === "number" ? value : fallback
  return (
    <Frame {...props}>
      <NumberStepper
        value={shown}
        fallback={fallback}
        min={min}
        max={max}
        step={field.step ?? (field.integer ? 1 : 0.1)}
        unit=""
        shown={fieldValueText(field, shown)}
        label={fieldCaption(field)}
        icon={settingIconOf(field.name, fieldRoleOf(field, ""))}
        onChange={(next) => form.setInput(field.name, next)}
      />
    </Frame>
  )
}

function SwitchControl({ field, value, form }: FieldProps): ReactElement {
  if (field.kind === "choice") {
    return <ChoiceControlField field={field} value={value} form={form} />
  }
  return (
    <SwitchRow
      label={fieldCaption(field)}
      checked={value === "on"}
      onCheckedChange={(checked) =>
        form.setInput(field.name, checked ? "on" : "off")
      }
    />
  )
}

function ChoiceControlField({
  field,
  value,
  form,
}: FieldProps): ReactElement | null {
  if (field.kind !== "choice") {
    return null
  }
  return (
    <ChoiceField
      label={fieldCaption(field)}
      items={fieldOptionsOf(field)}
      value={value === undefined ? "" : String(value)}
      notSet={t("field.choice.notSet")}
      setting={field.name}
      role={fieldRoleOf(field, choiceOutput)}
      note={null}
      problem={form.problems.get(field.name)}
      onChange={(next) => {
        const option = field.options.find((one) => String(one) === next)
        form.setInput(field.name, option)
      }}
    />
  )
}

function MediaControl({ field, value, form }: FieldProps): ReactElement | null {
  const [message, setMessage] = useState<string | null>(null)
  if (field.kind !== "media") {
    return null
  }
  return (
    <FieldFrame
      caption={fieldCaption(field)}
      isOptional={!field.required}
      note={null}
      problem={form.problems.get(field.name)}
      message={message}
    >
      <DropWell
        kind={field.media}
        ids={listOf(value)}
        max={field.max}
        onChange={(next) => form.setInput(field.name, next)}
        onMessage={setMessage}
      />
    </FieldFrame>
  )
}

export function HostedField(props: FieldProps): ReactElement | null {
  if (props.field.kind === "media") {
    return <MediaControl {...props} />
  }
  switch (controlOf(fieldShapeOf(props.field))) {
    case "switch":
      return <SwitchControl {...props} />
    case "select":
      return <ChoiceControlField {...props} />
    case "stepper":
      return <StepperControl {...props} />
    case "seed":
      return <SeedControl {...props} />
    case "text":
      return <TextControl {...props} />
  }
}

function fieldRows(
  fields: readonly ModelField[],
  form: AppForm,
  placeholder?: string
): ReactNode {
  return fields.map((field) => (
    <HostedField
      key={field.name}
      field={field}
      value={form.values.inputs[field.name]}
      form={form}
      {...(field.kind === "prompt" && placeholder !== undefined
        ? { placeholder }
        : {})}
    />
  ))
}

export function HostedSettings({
  fields,
  form,
  folded = [],
}: {
  fields: readonly ModelField[]
  form: AppForm
  folded?: readonly ModelField[]
}): ReactNode {
  const plan = fieldSettingsPlan(fields)
  const advanced = [...folded, ...plan.advanced]
  return (
    <>
      {fieldRows(plan.main, form)}
      {advanced.length === 0 ? null : (
        <AdvancedSection>{fieldRows(advanced, form)}</AdvancedSection>
      )}
    </>
  )
}

export function foldedMediaOf(
  media: readonly ModelField[]
): readonly ModelField[] {
  const optional = media.filter((field) => !field.required)
  return optional.length > 1 ? optional : []
}

export function HostedFields({
  fields,
  form,
  skip = [],
  app,
  model,
}: HostedFieldsProps): ReactElement | null {
  const shown = fields.filter(
    (field) => isShownField(field) && !skip.includes(field.kind)
  )
  const media = shown.filter((field) => field.kind === "media")
  const folded = foldedMediaOf(media)
  const prompts = shown.filter((field) => field.kind === "prompt")
  const settings = shown.filter(isSettingField)
  const placeholder = promptPlaceholderOf(
    app ?? null,
    app === undefined ? null : promptInputOf(app)
  )
  return shown.length === 0 && model === undefined ? null : (
    <div className="flex flex-col gap-s4">
      {fieldRows(
        media.filter((field) => !folded.includes(field)),
        form
      )}
      {fieldRows(prompts, form, placeholder)}
      {model}
      <HostedSettings fields={settings} form={form} folded={folded} />
    </div>
  )
}
