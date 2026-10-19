import type { InputDefinition } from "@rosesfield/contract"
import { type ReactElement, useEffect, useRef } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { SeedField } from "@/screens/app/fields/seed-field"
import { ToggleField } from "@/screens/app/fields/toggle-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import { photoLimitsText } from "@/studio/headshots/photo-check"
import {
  choiceValue,
  type HeadshotsScreenState,
  photoInput,
} from "@/studio/headshots/use-headshots-screen"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

type PanelProps = { state: HeadshotsScreenState }

function choiceInputOf(
  state: HeadshotsScreenState,
  name: string
): ChoiceInput | null {
  const input = state.app.inputs.find((one) => one.name === name)
  return input?.type === "choice" ? input : null
}

function Choice({
  state,
  name,
  note,
}: PanelProps & { name: string; note?: string | null }): ReactElement | null {
  const input = choiceInputOf(state, name)
  if (input === null) {
    return null
  }
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={input.options.map((option) => ({
        value: option.value,
        label: tCatalog(option.labelKey),
      }))}
      value={choiceValue(state, name)}
      onChange={(value) => state.form.setInput(name, value)}
      note={note === undefined ? inputNote(state.app, input) : note}
      register={(focus) => state.form.register(name, focus)}
    />
  )
}

function PhotoField({ state }: PanelProps): ReactElement | null {
  const input = state.app.inputs.find((one) => one.name === photoInput)
  const trigger = useRef<HTMLButtonElement>(null)
  const { form } = state
  useEffect(() => {
    form.register(photoInput, () => trigger.current?.focus())
  }, [form])
  if (input === undefined || !isAssetInput(input)) {
    return null
  }
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={inputNote(state.app, input)}
      problem={form.problems.get(photoInput)}
      message={state.photoMessage}
    >
      <DropWell
        kind="image"
        ids={listOf(form.values.inputs[photoInput])}
        max={input.max}
        onChange={(ids) => form.setInput(photoInput, ids)}
        onMessage={state.onPhotoMessage}
        triggerRef={trigger}
        limits={photoLimitsText()}
      />
    </FieldFrame>
  )
}

function GlassesField({ state }: PanelProps): ReactElement | null {
  const input = state.app.inputs.find((one) => one.name === "keepGlasses")
  if (input?.type !== "toggle") {
    return null
  }
  return (
    <ToggleField
      app={state.app}
      input={input}
      value={state.form.values.inputs[input.name]}
      problem={undefined}
      onChange={(value) => state.form.setInput(input.name, value)}
      register={(focus) => state.form.register(input.name, focus)}
    />
  )
}

function Advanced({ state }: PanelProps): ReactElement {
  const { form } = state
  const seed = state.app.inputs.find((input) => input.type === "seed")
  const seedValue =
    seed === undefined ? undefined : form.values.inputs[seed.name]
  return (
    <CollapsibleSection title={t("field.advanced")}>
      {seed === undefined ? null : (
        <SeedField
          mode={form.values.seedMode}
          value={seedValue}
          onMode={(mode) => {
            form.setForm({ seedMode: mode })
            if (mode === "fixed" && typeof seedValue !== "number") {
              form.setInput(seed.name, state.lastSeed ?? randomSeed())
            }
          }}
          onChange={(next) => form.setInput(seed.name, next)}
        />
      )}
    </CollapsibleSection>
  )
}

export function HeadshotsPanel({ state }: PanelProps): ReactElement {
  const { app, form } = state
  const framing = choiceValue(state, "framing")
  return (
    <div className="flex flex-col gap-s4">
      <PhotoField state={state} />
      <Choice state={state} name="background" />
      <Choice state={state} name="clothes" />
      <Choice
        state={state}
        name="framing"
        note={tCatalog(`headshots.input.framing.note.${framing}`)}
      />
      <GlassesField state={state} />
      <AspectField
        app={app}
        value={form.values.aspectRatio}
        onChange={(aspectRatio) => form.setForm({ aspectRatio })}
      />
      <CountField
        app={app}
        value={form.values.count}
        onChange={(count) => form.setForm({ count })}
      />
      <Advanced state={state} />
    </div>
  )
}
