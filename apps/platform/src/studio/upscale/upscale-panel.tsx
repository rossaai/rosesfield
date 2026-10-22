import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { TabsList, TabsTrigger, Tabs } from "@rosesfield/ui/components/tabs"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceControl, ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { SeedField } from "@/screens/app/fields/seed-field"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { randomSeed } from "@/screens/app/inputs-panel"
import {
  isUpscaleMode,
  type UpscaleMode,
} from "@/studio/upscale/upscale-limits"
import {
  modelInput,
  type ScaleOption,
  scaleInput,
  upscaleModes,
} from "@/studio/upscale/upscale-models"
import type { UpscaleState } from "@/studio/upscale/use-upscale-screen"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

const scaleKeys: Readonly<Record<number, string>> = {
  2: "upscale.choice.scale.x2",
  4: "upscale.choice.scale.x4",
}

function choiceOf(app: AppListing, name: string): ChoiceInput | null {
  const input = app.inputs.find((one) => one.name === name)
  return input?.type === "choice" ? input : null
}

export function scaleLabelOf(app: AppListing, option: ScaleOption): string {
  const listed = choiceOf(app, scaleInput)?.options.find(
    (one) => one.value === option.value
  )
  if (listed !== undefined) {
    return tCatalog(listed.labelKey)
  }
  const key = option.factor === null ? undefined : scaleKeys[option.factor]
  return key === undefined ? String(option.value) : tCatalog(key)
}

type ScaleView = Pick<UpscaleState, "app" | "scale">

export function scaleNoteOf(state: ScaleView): string | null {
  const { check, spec, value } = state.scale
  if (check.state === "fits") {
    return tCatalog("upscale.input.scale.note", {
      width: check.width,
      height: check.height,
    })
  }
  const option = spec?.options.find((one) => one.value === value)
  if (option === undefined || option.factor === null) {
    return null
  }
  return tCatalog("upscale.input.scale.noteEmpty", {
    scale: scaleLabelOf(state.app, option),
  })
}

export function scaleMessageOf(state: ScaleView): string | null {
  const { check, spec, value } = state.scale
  const option = spec?.options.find((one) => one.value === value)
  if (check.state !== "tooBig" || option === undefined) {
    return null
  }
  return tCatalog("upscale.input.scale.tooBig", {
    scale: scaleLabelOf(state.app, option),
    width: check.width,
    height: check.height,
    max: check.max,
  })
}

export function ModeTabs({
  state,
}: {
  state: Pick<UpscaleState, "mode" | "setMode">
}): ReactElement {
  return (
    <Tabs
      value={state.mode}
      onValueChange={(next) => {
        if (isUpscaleMode(next)) {
          state.setMode(next)
        }
      }}
    >
      <TabsList aria-label={tCatalog("upscale.input.mode.label")}>
        {upscaleModes.map((one) => (
          <TabsTrigger key={one} value={one}>
            {tCatalog(`upscale.choice.mode.${one}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function wellCaptionOf(app: AppListing, mode: UpscaleMode): string {
  const input = app.inputs.find((one) => one.name === mode)
  return input === undefined
    ? tCatalog(`upscale.choice.mode.${mode}`)
    : inputCaption(input)
}

function wellNoteOf(app: AppListing, mode: UpscaleMode): string | null {
  const input = app.inputs.find((one) => one.name === mode)
  return input === undefined ? null : inputNote(app, input)
}

function FileWell({ state }: { state: UpscaleState }): ReactElement {
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { form, registerWell, mode, well } = state
  const name = well.name
  useEffect(() => {
    const focus = (): void => trigger.current?.focus()
    form.register(name, focus)
    registerWell(focus)
  }, [form, name, registerWell])
  const { limits } = well
  return (
    <FieldFrame
      caption={wellCaptionOf(state.app, mode)}
      isOptional={false}
      note={wellNoteOf(state.app, mode)}
      problem={form.problems.get(name)}
      message={wellMessage ?? state.fileMessage}
    >
      <DropWell
        kind={mode}
        ids={listOf(form.values.inputs[name])}
        max={1}
        onChange={(ids) => form.setInput(name, ids)}
        onMessage={setWellMessage}
        triggerRef={trigger}
        limits={assetLimitsText({
          formats: limits.formats,
          bytes: limits.maxBytes,
          ...(limits.minSide === null ? {} : { shortSide: limits.minSide }),
          ...(limits.seconds === null ? {} : { seconds: limits.seconds }),
        })}
      />
    </FieldFrame>
  )
}

function ScaleField({ state }: { state: UpscaleState }): ReactElement | null {
  const holder = useRef<HTMLDivElement>(null)
  const { registerScale } = state
  useEffect(() => {
    registerScale(() =>
      holder.current
        ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus()
    )
  }, [registerScale])
  const { spec, value } = state.scale
  if (spec === null || spec.options.length === 0) {
    return null
  }
  const caption = tCatalog("upscale.input.scale.label")
  return (
    <div ref={holder}>
      <FieldFrame
        caption={caption}
        isOptional={false}
        note={scaleNoteOf(state)}
        problem={state.form.problems.get(spec.name)}
        message={scaleMessageOf(state)}
      >
        <ChoiceControl
          label={caption}
          items={spec.options.map((option) => ({
            value: String(option.value),
            label: scaleLabelOf(state.app, option),
          }))}
          value={value === null ? "" : String(value)}
          onChange={(next) => {
            const option = spec.options.find(
              (one) => String(one.value) === next
            )
            if (option !== undefined) {
              state.form.setInput(spec.name, option.value)
            }
          }}
        />
      </FieldFrame>
    </div>
  )
}

function GraphModelField({
  state,
}: {
  state: UpscaleState
}): ReactElement | null {
  const input = choiceOf(state.app, modelInput)
  if (input === null || input.options.length < 2) {
    return null
  }
  const value = textOf(state.form.values.inputs[modelInput]) || input.default
  const option = input.options.find((one) => one.value === value)
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={input.options.map((one) => ({
        value: one.value,
        label: tCatalog(one.labelKey),
      }))}
      value={value}
      onChange={(next) => state.form.setInput(modelInput, next)}
      note={option === undefined ? null : tCatalog(`${option.labelKey}.line`)}
    />
  )
}

function ModelRow({ state }: { state: UpscaleState }): ReactElement | null {
  return state.hosted.isTaskApp ? (
    <CatalogPicker hosted={state.hosted} place="row" />
  ) : (
    <GraphModelField state={state} />
  )
}

function isGraphChosen(state: UpscaleState): boolean {
  const chosen = state.hosted.chosen
  return chosen === null || chosen.form === null
}

function SeedInput({ state }: { state: UpscaleState }): ReactElement | null {
  const seed = state.app.inputs.find((input) => input.type === "seed")
  if (seed === undefined || !isGraphChosen(state)) {
    return null
  }
  const { form } = state
  const value = form.values.inputs[seed.name]
  return (
    <SeedField
      mode={form.values.seedMode}
      value={value}
      onMode={(mode) => {
        form.setForm({ seedMode: mode })
        if (mode === "fixed" && typeof value !== "number") {
          form.setInput(seed.name, state.lastSeed ?? randomSeed())
        }
      }}
      onChange={(next) => form.setInput(seed.name, next)}
    />
  )
}

function Advanced({ state }: { state: UpscaleState }): ReactElement | null {
  const optional = state.restFields.filter((field) => !field.required)
  if (optional.length === 0 && !isGraphChosen(state)) {
    return null
  }
  return (
    <CollapsibleSection title={t("field.advanced")}>
      <HostedFields fields={optional} form={state.form} />
      <SeedInput state={state} />
    </CollapsibleSection>
  )
}

export function UpscalePanel({ state }: { state: UpscaleState }): ReactElement {
  const required = state.restFields.filter((field) => field.required)
  return (
    <div className="flex flex-col gap-s4">
      <FileWell key={`${state.mode}-${state.well.name}`} state={state} />
      <ScaleField state={state} />
      <ModelRow state={state} />
      <HostedFields fields={required} form={state.form} />
      <Advanced state={state} />
    </div>
  )
}
