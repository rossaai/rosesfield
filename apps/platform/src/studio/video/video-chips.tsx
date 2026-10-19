import type { AppListing } from "@rosesfield/contract"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { Switch } from "@rosesfield/ui/components/switch"
import { Volume2Icon, VolumeOffIcon } from "lucide-react"
import { type ReactElement, useId } from "react"
import { withUnit } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { aspectField } from "@/screens/app/app-form"
import { SettingChip, StepperChip } from "@/screens/app/bar/setting-chip"
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
  if (field.kind === "number") {
    const min = field.min ?? 0
    const chosen = numberOf(value, field.default ?? min)
    return (
      <StepperChip
        label={label}
        shown={shown(chosen)}
        value={chosen}
        min={min}
        max={field.max ?? min}
        step={1}
        unit={tCatalog("video.input.length.unit")}
        onChange={(next) => form.setInput(field.name, next)}
      />
    )
  }
  const current = value === undefined ? "" : String(value)
  return (
    <ChipSelect
      label={label}
      value={current}
      display={current === "" ? label : shown(current)}
      onValueChange={(next) =>
        form.setInput(
          field.name,
          field.options.find((one) => String(one) === next)
        )
      }
      options={field.options.map((option) => ({
        value: String(option),
        label: shown(option),
      }))}
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
}): ReactElement {
  if (fields === null) {
    return (
      <div className="flex flex-wrap items-center gap-s2">
        {graphChips.map((name) => (
          <SettingChip key={name} app={app} form={form} name={name} />
        ))}
      </div>
    )
  }
  const plain = (value: string | number): string => String(value)
  return (
    <div className="flex flex-wrap items-center gap-s2">
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
    </div>
  )
}

export function SoundSwitch({
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
  const id = useId()
  const name = isGraph ? soundInput : (fields?.sound?.name ?? null)
  if (name === null && !makesSound) {
    return null
  }
  const isOn = name === null || textOf(form.values.inputs[name]) !== "off"
  const Icon = isOn ? Volume2Icon : VolumeOffIcon
  return (
    <div className="flex flex-col gap-s1">
      <div className="flex items-center justify-between gap-s3 rounded-field bg-(--well) px-s5 py-s2">
        <label
          htmlFor={id}
          className="flex items-center gap-s2 text-body text-ink"
        >
          <Icon aria-hidden="true" className="glyph text-ink-muted" />
          {tCatalog("video.input.sound.label")}
        </label>
        <Switch
          id={id}
          aria-label={tCatalog("video.input.sound.label")}
          checked={isOn}
          disabled={name === null}
          onCheckedChange={(checked) => {
            if (name !== null) {
              form.setInput(name, checked ? "on" : "off")
            }
          }}
        />
      </div>
      {name === null ? (
        <p className="px-s1 text-label text-ink-muted">
          {tCatalog("video.sound.always")}
        </p>
      ) : null}
    </div>
  )
}
