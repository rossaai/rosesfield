import type { AppListing } from "@rosesfield/contract"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { aspectField } from "@/screens/app/app-form"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { AppSettingsSection } from "@/screens/app/fields/setting-rows"
import { appSettingsPlan } from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"
import { clipLimitsOf, photoLimitsOf } from "@/studio/motion/motion-panel"
import { graphClipRange } from "@/studio/motion/motion-tabs"
import {
  PresetTiles,
  presetMediaOf,
  presetNameOf,
  presetNeedOf,
} from "@/studio/vfx/preset-tiles"
import {
  clipInput,
  photoInput,
  presetInput,
  type VfxChecks,
} from "@/studio/vfx/use-vfx-checks"

type VfxPanelProps = {
  app: AppListing
  form: AppForm
  checks: VfxChecks
  lastSeed: number | null
}

type WellProps = {
  form: AppForm
  name: string
  kind: "image" | "video"
  limits: string
  problem: VfxChecks["photo"]
}

function Well(props: WellProps): ReactElement {
  const { form, name } = props
  const trigger = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    form.register(name, () => trigger.current?.focus())
  }, [form, name])
  return (
    <FieldFrame
      caption={tCatalog(`vfx.input.${name}.label`)}
      isOptional={false}
      note={null}
      problem={props.problem ?? form.problems.get(name)}
      message={message}
    >
      <DropWell
        kind={props.kind}
        ids={listOf(form.values.inputs[name])}
        max={1}
        onChange={(ids) => form.setInput(name, ids)}
        onMessage={setMessage}
        triggerRef={trigger}
        limits={props.limits}
      />
    </FieldFrame>
  )
}

function PresetNeed({ checks }: { checks: VfxChecks }): ReactElement | null {
  const { preset } = checks
  if (preset === null) {
    return null
  }
  const media = presetMediaOf(preset)
  return (
    <section
      data-slot="preset-need"
      className="flex flex-col gap-s3 rounded-card bg-(--well) p-s3"
    >
      <h3 className="text-body font-medium text-ink">{presetNameOf(preset)}</h3>
      <p className="text-body text-ink-muted">{presetNeedOf(preset)}</p>
      {media.kind === "guide" ? (
        <figure className="flex items-start gap-s3">
          <video
            src={`${media.src}#t=0.001`}
            aria-label={tCatalog("vfx.frame0.label")}
            muted
            playsInline
            preload="metadata"
            className="w-24 shrink-0 rounded-cell bg-canvas"
          />
          <figcaption className="flex flex-col gap-s1">
            <span className="text-label font-medium text-ink">
              {tCatalog("vfx.frame0.label")}
            </span>
            <span className="text-label text-ink-muted">
              {tCatalog("vfx.frame0.note")}
            </span>
          </figcaption>
        </figure>
      ) : null}
    </section>
  )
}

export function VfxPanel(props: VfxPanelProps): ReactElement {
  const { app, form, checks } = props
  const preset = textOf(form.values.inputs[presetInput])
  return (
    <div className="flex flex-col gap-s4">
      <PresetTiles
        value={preset}
        onChange={(value) => form.setInput(presetInput, value)}
        register={(focus) => form.register(presetInput, focus)}
      />
      <PresetNeed checks={checks} />
      {checks.preset?.kind === "photo" ? (
        <Well
          form={form}
          name={photoInput}
          kind="image"
          limits={photoLimitsOf()}
          problem={checks.photo}
        />
      ) : null}
      {checks.preset?.kind === "clip" ? (
        <Well
          form={form}
          name={clipInput}
          kind="video"
          limits={clipLimitsOf({ range: graphClipRange })}
          problem={checks.clip}
        />
      ) : null}
      <AppSettingsSection
        app={app}
        form={form}
        lastSeed={props.lastSeed}
        plan={appSettingsPlan(app, [presetInput, aspectField])}
      />
    </div>
  )
}
