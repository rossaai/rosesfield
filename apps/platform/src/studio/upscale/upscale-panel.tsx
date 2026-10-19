import type { InputDefinition } from "@rosesfield/contract"
import { type ReactElement, useEffect, useRef, useState } from "react"
import type { AssetInput } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceControl, ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import {
  maxVideoSeconds,
  minVideoSeconds,
  modeLimits,
} from "@/studio/upscale/upscale-limits"
import {
  modeInput,
  modelInput,
  scaleInput,
  type UpscaleState,
} from "@/studio/upscale/use-upscale-screen"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function choiceOf(state: UpscaleState, name: string): ChoiceInput | null {
  const input = state.app.inputs.find((one) => one.name === name)
  return input?.type === "choice" ? input : null
}

function itemsOf(input: ChoiceInput) {
  return input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
}

function labelOf(input: ChoiceInput, value: string): string {
  const option = input.options.find((one) => one.value === value)
  return option === undefined ? value : tCatalog(option.labelKey)
}

function ModeControl({ state }: { state: UpscaleState }): ReactElement | null {
  const input = choiceOf(state, modeInput)
  if (input === null) {
    return null
  }
  return (
    <ChoiceControl
      label={inputCaption(input)}
      items={itemsOf(input)}
      value={state.mode}
      onChange={(value) => state.form.setInput(modeInput, value)}
    />
  )
}

function FileWell({ state }: { state: UpscaleState }): ReactElement | null {
  const input = state.app.inputs.find((one) => one.name === state.mode)
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { form, registerWell } = state
  const name = state.mode
  useEffect(() => {
    const focus = (): void => trigger.current?.focus()
    form.register(name, focus)
    registerWell(focus)
  }, [form, name, registerWell])
  if (
    input === undefined ||
    (input.type !== "image" && input.type !== "video")
  ) {
    return null
  }
  const asset: AssetInput = input
  const note = inputNote(state.app, asset)
  const limits = modeLimits[state.mode]
  return (
    <FieldFrame
      caption={inputCaption(asset)}
      isOptional={false}
      note={note}
      problem={form.problems.get(name)}
      message={wellMessage ?? state.fileMessage}
    >
      <DropWell
        kind={asset.type}
        ids={listOf(form.values.inputs[name])}
        max={asset.max}
        onChange={(ids) => form.setInput(name, ids)}
        onMessage={setWellMessage}
        triggerRef={trigger}
        limits={assetLimitsText({
          formats: limits.formats,
          bytes: limits.maxBytes,
          shortSide: limits.minSide,
          ...(state.mode === "video"
            ? { seconds: { min: minVideoSeconds, max: maxVideoSeconds } }
            : {}),
        })}
      />
    </FieldFrame>
  )
}

function ScaleField({ state }: { state: UpscaleState }): ReactElement | null {
  const input = choiceOf(state, scaleInput)
  const holder = useRef<HTMLDivElement>(null)
  const { registerScale } = state
  useEffect(() => {
    registerScale(() =>
      holder.current
        ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus()
    )
  }, [registerScale])
  if (input === null) {
    return null
  }
  const value = textOf(state.form.values.inputs[scaleInput]) || input.default
  const check = state.scaleCheck
  const scale = labelOf(input, value)
  const note =
    check.state === "fits"
      ? tCatalog("upscale.input.scale.note", {
          width: check.width,
          height: check.height,
        })
      : tCatalog("upscale.input.scale.noteEmpty", { scale })
  const message =
    check.state === "tooBig"
      ? tCatalog("upscale.input.scale.tooBig", {
          scale,
          width: check.width,
          height: check.height,
          max: check.max,
        })
      : null
  return (
    <div ref={holder}>
      <FieldFrame
        caption={inputCaption(input)}
        isOptional={false}
        note={note}
        problem={undefined}
        message={message}
      >
        <ChoiceControl
          label={inputCaption(input)}
          items={itemsOf(input)}
          value={value}
          onChange={(next) => state.form.setInput(scaleInput, next)}
        />
      </FieldFrame>
    </div>
  )
}

function ModelField({ state }: { state: UpscaleState }): ReactElement | null {
  const input = choiceOf(state, modelInput)
  if (input === null || input.options.length < 2) {
    return null
  }
  const value = textOf(state.form.values.inputs[modelInput]) || input.default
  const option = input.options.find((one) => one.value === value)
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={itemsOf(input)}
      value={value}
      onChange={(next) => state.form.setInput(modelInput, next)}
      note={option === undefined ? null : tCatalog(`${option.labelKey}.line`)}
    />
  )
}

function SeedInput({ state }: { state: UpscaleState }): ReactElement | null {
  const seed = state.app.inputs.find((input) => input.type === "seed")
  if (seed === undefined) {
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

export function UpscalePanel({ state }: { state: UpscaleState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <ModeControl state={state} />
      <FileWell key={state.mode} state={state} />
      <ScaleField state={state} />
      <CollapsibleSection title={t("field.advanced")}>
        <ModelField state={state} />
        <SeedInput state={state} />
      </CollapsibleSection>
    </div>
  )
}
