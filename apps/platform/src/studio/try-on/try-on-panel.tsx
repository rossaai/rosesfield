import type { InputDefinition } from "@rosesfield/contract"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import { type PhotoName, photoLimits } from "@/studio/try-on/try-on-limits"
import type { TryOnState } from "@/studio/try-on/use-try-on-screen"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function choiceOf(state: TryOnState, name: string): ChoiceInput | null {
  const input = state.app.inputs.find((one) => one.name === name)
  return input?.type === "choice" ? input : null
}

function itemsOf(input: ChoiceInput) {
  return input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
}

function PhotoWell({
  state,
  name,
}: {
  state: TryOnState
  name: PhotoName
}): ReactElement | null {
  const input = state.app.inputs.find((one) => one.name === name)
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { form, registerWell } = state
  useEffect(() => {
    registerWell(name, () => trigger.current?.focus())
  }, [name, registerWell])
  if (input?.type !== "image") {
    return null
  }
  const note = inputNote(state.app, input)
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={note}
      problem={undefined}
      message={wellMessage ?? state.messages[name]}
    >
      <DropWell
        kind="image"
        ids={listOf(form.values.inputs[name])}
        max={input.max}
        onChange={(ids) => form.setInput(name, ids)}
        onMessage={setWellMessage}
        triggerRef={trigger}
        limits={assetLimitsText({
          formats: photoLimits[name].formats,
          bytes: photoLimits[name].maxBytes,
          shortSide: photoLimits[name].minSide,
          ...(photoLimits[name].maxRatio === null
            ? {}
            : {
                ratio: {
                  min: `1:${photoLimits[name].maxRatio}`,
                  max: `${photoLimits[name].maxRatio}:1`,
                },
              }),
        })}
      />
    </FieldFrame>
  )
}

function PartField({ state }: { state: TryOnState }): ReactElement | null {
  const input = choiceOf(state, "part")
  if (input === null) {
    return null
  }
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={itemsOf(input)}
      value={textOf(state.form.values.inputs.part) || input.default}
      onChange={(next) => state.form.setInput("part", next)}
      note={inputNote(state.app, input)}
    />
  )
}

function ModelField({ state }: { state: TryOnState }): ReactElement | null {
  const input = choiceOf(state, "model")
  if (input === null || input.options.length < 2) {
    return null
  }
  const value = textOf(state.form.values.inputs.model) || input.default
  const option = input.options.find((one) => one.value === value)
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={itemsOf(input)}
      value={value}
      onChange={(next) => state.form.setInput("model", next)}
      note={option === undefined ? null : tCatalog(`${option.labelKey}.line`)}
    />
  )
}

function SeedInput({ state }: { state: TryOnState }): ReactElement | null {
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

export function TryOnPanel({ state }: { state: TryOnState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <PhotoWell state={state} name="person" />
      <PhotoWell state={state} name="clothes" />
      <PartField state={state} />
      <CollapsibleSection title={t("field.advanced")}>
        <ModelField state={state} />
        <SeedInput state={state} />
      </CollapsibleSection>
    </div>
  )
}
