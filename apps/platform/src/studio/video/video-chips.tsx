import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { Chip } from "@rosesfield/ui/components/chip"
import { Volume2Icon, VolumeOffIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { tCatalog } from "@/copy/t"
import { appliedApp } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import {
  AdvancedSection,
  AppSettingsSection,
} from "@/screens/app/fields/setting-rows"
import { HostedField } from "@/screens/app/hosted/hosted-fields"
import { appSettingsPlan, fieldSettingsPlan } from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"
import type { VideoFields } from "@/studio/video/video-fields"

export const soundInput = "sound"

export function settingFieldsOf(fields: VideoFields): ModelField[] {
  return [
    fields.length,
    fields.aspect,
    fields.resolution,
    ...fields.required,
    ...fields.rest,
  ].flatMap((field) => (field === null ? [] : [field]))
}

function FieldRows({
  fields,
  form,
}: {
  fields: readonly ModelField[]
  form: AppForm
}): ReactNode {
  return fields.map((field) => (
    <HostedField
      key={field.name}
      field={field}
      value={form.values.inputs[field.name]}
      form={form}
    />
  ))
}

export function VideoSettings({
  app,
  form,
  fields,
  lastSeed,
  placed,
  count = null,
}: {
  app: AppListing
  form: AppForm
  fields: VideoFields | null
  lastSeed: number | null
  placed: readonly string[]
  count?: ReactNode
}): ReactNode {
  if (fields === null) {
    return (
      <AppSettingsSection
        app={app}
        form={form}
        lastSeed={lastSeed}
        plan={appSettingsPlan(appliedApp(app, form.values.inputs), [
          soundInput,
          ...placed,
        ])}
      />
    )
  }
  const plan = fieldSettingsPlan(settingFieldsOf(fields))
  return (
    <>
      <FieldRows fields={plan.main} form={form} />
      {count}
      {plan.advanced.length === 0 ? null : (
        <AdvancedSection>
          <FieldRows fields={plan.advanced} form={form} />
        </AdvancedSection>
      )}
    </>
  )
}

export function SoundChip({
  form,
  fields,
  isGraph,
  makesSound,
}: {
  form: AppForm
  fields: VideoFields | null
  isGraph: boolean
  makesSound: boolean
}): ReactElement | null {
  const name = isGraph ? soundInput : (fields?.sound?.name ?? null)
  if (name === null && !makesSound) {
    return null
  }
  const isOn = name === null || textOf(form.values.inputs[name]) !== "off"
  const Icon = isOn ? Volume2Icon : VolumeOffIcon
  return (
    <Chip
      aria-pressed={isOn}
      disabled={name === null}
      {...(name === null ? { caption: tCatalog("video.sound.always") } : {})}
      icon={<Icon aria-hidden="true" />}
      onClick={() => {
        if (name !== null) {
          form.setInput(name, isOn ? "off" : "on")
        }
      }}
    >
      {tCatalog("video.input.sound.label")}
    </Chip>
  )
}
