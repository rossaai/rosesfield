import type { InputDefinition } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { SeedField } from "@/screens/app/fields/seed-field"
import { randomSeed } from "@/screens/app/inputs-panel"
import { isShownIn, modeInput } from "@/studio/angles/angles-modes"
import {
  imageFormats,
  largestImageBytes,
  shortestSide,
} from "@/studio/angles/image-check"
import {
  type AnglesScreenState,
  choiceValue,
  imageInput,
} from "@/studio/angles/use-angles-screen"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

type PanelProps = { state: AnglesScreenState }

function choiceInputOf(
  state: AnglesScreenState,
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

function ImageField({ state }: PanelProps): ReactElement | null {
  const input = state.app.inputs.find((one) => one.name === imageInput)
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { form, registerImage } = state
  useEffect(() => {
    const focus = (): void => trigger.current?.focus()
    form.register(imageInput, focus)
    registerImage(focus)
  }, [form, registerImage])
  if (input === undefined || !isAssetInput(input)) {
    return null
  }
  const note = state.imageNote ?? inputNote(state.app, input)
  const retry = state.retryImage
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={note}
      problem={form.problems.get(imageInput)}
      message={wellMessage ?? state.imageRefusal}
    >
      <DropWell
        kind="image"
        ids={listOf(form.values.inputs[imageInput])}
        max={input.max}
        onChange={(ids) => form.setInput(imageInput, ids)}
        onMessage={setWellMessage}
        triggerRef={trigger}
        limits={assetLimitsText({
          formats: imageFormats,
          bytes: largestImageBytes,
          shortSide: shortestSide,
          ratio: { min: "9:16", max: "16:9" },
        })}
      />
      {retry === null ? null : (
        <Button className="self-start" onClick={retry}>
          {t("state.tryAgain")}
        </Button>
      )}
    </FieldFrame>
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

export function AnglesPanel({ state }: PanelProps): ReactElement {
  const angleSet = choiceValue(state, "angleSet")
  const isShown = (name: string): boolean =>
    isShownIn(state.app, state.mode, name)
  return (
    <div className="flex flex-col gap-s4">
      <Choice state={state} name={modeInput} note={null} />
      <ImageField state={state} />
      {isShown("angleSet") ? (
        <Choice
          state={state}
          name="angleSet"
          note={tCatalog(`angles.input.angleSet.note.${angleSet}`)}
        />
      ) : null}
      {isShown("side") ? <Choice state={state} name="side" /> : null}
      {isShown("height") ? <Choice state={state} name="height" /> : null}
      <Choice state={state} name="distance" />
      <Advanced state={state} />
    </div>
  )
}
