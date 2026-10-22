import { fieldRoleOf } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { Chip } from "@rosesfield/ui/components/chip"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { SettingTiles } from "@rosesfield/ui/components/input-panel"
import { Volume2Icon, VolumeOffIcon } from "lucide-react"
import type { ReactElement } from "react"
import { withUnit } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { aspectField } from "@/screens/app/app-form"
import {
  chipIconOf,
  SettingChip,
  StepperChip,
  withShapes,
} from "@/screens/app/bar/setting-chip"
import { numberOf, textOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import type { ChipField, VideoFields } from "@/studio/video/video-fields"

const graphChips: readonly string[] = ["length", aspectField, "resolution"]

const soundInput = "sound"

function seconds(value: string | number): string {
  const number = Number(value)
  return Number.isFinite(number)
    ? withUnit(number, tCatalog("video.input.length.unit"))
    : String(value)
}

function FieldChip({
  field,
  label,
  form,
  shown,
}: {
  field: ChipField
  label: string
  form: AppForm
  shown: (value: string | number) => string
}): ReactElement {
  const value = form.values.inputs[field.name]
  const icon = chipIconOf(fieldRoleOf(field, "video"))
  if (field.kind === "number") {
    const min = field.min ?? 0
    const chosen = numberOf(value, field.default ?? min)
    return (
      <StepperChip
        label={label}
        shown={shown(chosen)}
        icon={icon}
        value={chosen}
        min={min}
        max={field.max ?? min}
        step={1}
        onChange={(next) => form.setInput(field.name, next)}
      />
    )
  }
  const current = value === undefined ? "" : String(value)
  const options = field.options.map((option) => ({
    value: String(option),
    label: shown(option),
  }))
  return (
    <ChipSelect
      label={label}
      icon={icon}
      value={current}
      display={current === "" ? t("field.choice.notSet") : shown(current)}
      onValueChange={(next) =>
        form.setInput(
          field.name,
          field.options.find((one) => String(one) === next)
        )
      }
      options={
        fieldRoleOf(field, "video") === "aspect" ? withShapes(options) : options
      }
    />
  )
}

export function VideoChips({
  app,
  form,
  fields,
}: {
  app: AppListing
  form: AppForm
  fields: VideoFields | null
}): ReactElement | null {
  if (fields === null) {
    return (
      <SettingTiles>
        {graphChips.map((name) => (
          <SettingChip key={name} app={app} form={form} name={name} />
        ))}
      </SettingTiles>
    )
  }
  if (
    fields.length === null &&
    fields.aspect === null &&
    fields.resolution === null
  ) {
    return null
  }
  const plain = (value: string | number): string => String(value)
  return (
    <SettingTiles>
      {fields.length === null ? null : (
        <FieldChip
          field={fields.length}
          label={tCatalog("video.input.length.label")}
          form={form}
          shown={seconds}
        />
      )}
      {fields.aspect === null ? null : (
        <FieldChip
          field={fields.aspect}
          label={t("field.aspect.label")}
          form={form}
          shown={plain}
        />
      )}
      {fields.resolution === null ? null : (
        <FieldChip
          field={fields.resolution}
          label={tCatalog("video.input.resolution.label")}
          form={form}
          shown={plain}
        />
      )}
    </SettingTiles>
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
