import type { ModelField } from "@rosesfield/catalog/comfy"
import { Input } from "@rosesfield/ui/components/input"
import { Switch } from "@rosesfield/ui/components/switch"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, type ReactNode, useId, useState } from "react"
import { hasCatalogText, t, tCatalog, tCount } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import type { FieldValue } from "@/screens/app/app-form"
import { ChoiceControl } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { wordsOfPath } from "@/screens/app/hosted/field-words"
import type { AppForm } from "@/screens/app/use-app-form"

type HostedFieldsProps = {
  fields: readonly ModelField[]
  form: AppForm
  skip?: readonly ModelField["kind"][]
}

type FieldProps = {
  field: ModelField
  value: FieldValue
  form: AppForm
}

export function fieldCaption(field: ModelField): string {
  const key = `model.field.${field.name}`
  return hasCatalogText(key)
    ? tCatalog(key)
    : t("model.field.other", { name: wordsOfPath(field.path) })
}

export function isShownField(field: ModelField): boolean {
  return !(field.kind === "choice" && field.options.length === 1)
}

function limitsOf(field: ModelField): string | null {
  if (field.kind === "number" && field.min !== null && field.max !== null) {
    return t("field.number.range", { min: field.min, max: field.max })
  }
  return field.kind === "media"
    ? tCount("field.asset.note", field.max, { max: field.max })
    : null
}

function Frame({
  field,
  form,
  children,
  note,
}: FieldProps & { children: ReactNode; note?: string | null }): ReactElement {
  return (
    <FieldFrame
      caption={fieldCaption(field)}
      isOptional={!field.required}
      note={note ?? null}
      problem={form.problems.get(field.name)}
    >
      {children}
    </FieldFrame>
  )
}

function TextControl({ field, value, form }: FieldProps): ReactElement {
  const id = useId()
  const isLong = field.kind === "prompt"
  const onChange = (next: string): void => form.setInput(field.name, next)
  return (
    <Frame field={field} value={value} form={form}>
      {isLong ? (
        <Textarea
          id={id}
          aria-label={fieldCaption(field)}
          value={textOf(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          aria-label={fieldCaption(field)}
          value={textOf(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Frame>
  )
}

function NumberControl({ field, value, form }: FieldProps): ReactElement {
  const limits = field.kind === "number" ? field : null
  return (
    <Frame field={field} value={value} form={form} note={limitsOf(field)}>
      <Input
        type="number"
        aria-label={fieldCaption(field)}
        value={typeof value === "number" ? String(value) : ""}
        min={limits?.min ?? undefined}
        max={limits?.max ?? undefined}
        step={limits?.integer === true ? 1 : "any"}
        onChange={(event) => {
          const next =
            event.target.value === "" ? undefined : Number(event.target.value)
          form.setInput(field.name, next)
        }}
      />
    </Frame>
  )
}

function ToggleControl({ field, value, form }: FieldProps): ReactElement {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-s3">
      <label htmlFor={id} className="text-label text-ink-muted">
        {fieldCaption(field)}
      </label>
      <Switch
        id={id}
        checked={value === "on"}
        onCheckedChange={(checked) =>
          form.setInput(field.name, checked ? "on" : "off")
        }
      />
    </div>
  )
}

function ChoiceFieldControl({
  field,
  value,
  form,
}: FieldProps): ReactElement | null {
  if (field.kind !== "choice") {
    return null
  }
  const items = field.options.map((option) => ({
    value: String(option),
    label: String(option),
  }))
  const chosen = value === undefined ? "" : String(value)
  return (
    <Frame field={field} value={value} form={form}>
      <ChoiceControl
        label={fieldCaption(field)}
        items={items}
        value={chosen}
        notSet={t("field.choice.notSet")}
        onChange={(next) => {
          const option = field.options.find((one) => String(one) === next)
          form.setInput(field.name, option)
        }}
      />
    </Frame>
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
      note={limitsOf(field)}
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

function HostedField(props: FieldProps): ReactElement | null {
  switch (props.field.kind) {
    case "prompt":
    case "text":
      return <TextControl {...props} />
    case "number":
      return <NumberControl {...props} />
    case "toggle":
      return <ToggleControl {...props} />
    case "choice":
      return <ChoiceFieldControl {...props} />
    case "media":
      return <MediaControl {...props} />
  }
}

export function HostedFields({
  fields,
  form,
  skip = [],
}: HostedFieldsProps): ReactElement | null {
  const shown = fields.filter(
    (field) => isShownField(field) && !skip.includes(field.kind)
  )
  return shown.length === 0 ? null : (
    <div className="flex flex-col gap-s4">
      {shown.map((field) => (
        <HostedField
          key={field.name}
          field={field}
          value={form.values.inputs[field.name]}
          form={form}
        />
      ))}
    </div>
  )
}
