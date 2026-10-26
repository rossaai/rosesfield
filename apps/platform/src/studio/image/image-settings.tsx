import type { AppListing } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { settingIconOf } from "@/catalog/setting-registry"
import { t } from "@/copy/t"
import { NumberStepper } from "@/pieces/number-stepper"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { CountField } from "@/screens/app/fields/output-fields"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { withoutModelInput } from "@/screens/app/hosted/task-panel"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import type { AppScreenState } from "@/screens/app/use-app-screen"
import { countBoundsOf, type ImageFields } from "@/studio/image/image-fields"
import { ImageModelSettings } from "@/studio/image/image-model-settings"

function HostedCountField({
  app,
  fields,
  form,
}: {
  app: AppListing
  fields: ImageFields
  form: AppForm
}): ReactElement | null {
  const { count } = fields
  if (count === null) {
    return fields.isOneAtATime ? (
      <CountField
        app={app}
        value={form.values.count}
        onChange={(value) => form.setForm({ count: value })}
      />
    ) : null
  }
  const bounds = countBoundsOf(count, form.values.inputs[count.name])
  return (
    <FieldFrame
      caption={t("field.count.label")}
      isOptional={false}
      note={null}
      problem={form.problems.get(count.name)}
    >
      <NumberStepper
        {...bounds}
        label={t("field.count.label")}
        icon={settingIconOf(count.name, "count")}
        step={1}
        unit=""
        onChange={(value) => form.setInput(count.name, value)}
      />
    </FieldFrame>
  )
}

export function HostedPanel({
  app,
  hosted,
  fields,
  form,
}: {
  app: AppListing
  hosted: HostedState
  fields: ImageFields | null
  form: AppForm
}): ReactElement {
  if (fields === null) {
    return <CatalogPicker hosted={hosted} place="row" />
  }
  const settings = [fields.aspect, fields.quality, fields.resolution].flatMap(
    (field) => (field === null ? [] : [field])
  )
  return (
    <div className="flex flex-col gap-s4">
      <CatalogPicker hosted={hosted} place="row" />
      <HostedFields fields={settings} form={form} />
      <HostedCountField app={app} fields={fields} form={form} />
      <HostedFields fields={fields.rest} form={form} />
    </div>
  )
}

export function GraphPanel({
  app,
  state,
  hosted,
}: {
  app: AppListing
  state: AppScreenState
  hosted: HostedState
}): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <CatalogPicker hosted={hosted} place="row" />
      <ImageModelSettings
        app={withoutModelInput(app)}
        state={state}
        chips={[]}
      />
    </div>
  )
}

export function ModelPopover({
  hosted,
}: {
  hosted: HostedState
}): ReactElement {
  return <CatalogPicker hosted={hosted} />
}
