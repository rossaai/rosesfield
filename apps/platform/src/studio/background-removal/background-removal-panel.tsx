import type { InputDefinition } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { t, tCatalog } from "@/copy/t"
import { assetLimitsText } from "@/pieces/asset-limits"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption } from "@/screens/app/fields/input-copy"
import {
  imageFormats,
  maxBytes,
  maxLongSide,
  minShortSide,
} from "@/studio/background-removal/image-limits"
import {
  type BackgroundRemovalState,
  backgroundInput,
  imageInput,
  modelInput,
} from "@/studio/background-removal/use-background-removal-screen"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function inputOf(state: BackgroundRemovalState, name: string) {
  return state.app.inputs.find((input) => input.name === name)
}

function choiceOf(
  state: BackgroundRemovalState,
  name: string
): ChoiceInput | null {
  const input = inputOf(state, name)
  return input?.type === "choice" ? input : null
}

function itemsOf(input: ChoiceInput) {
  return input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
}

function ImageWell({
  state,
}: {
  state: BackgroundRemovalState
}): ReactElement | null {
  const input = inputOf(state, imageInput)
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { form, registerWell, check } = state
  useEffect(() => {
    const focus = () => trigger.current?.focus()
    form.register(imageInput, focus)
    registerWell(focus)
  }, [form, registerWell])
  if (input?.type !== "image") {
    return null
  }
  const note = tCatalog("backgroundRemoval.input.image.note")
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={note}
      problem={form.problems.get(imageInput)}
      message={wellMessage ?? state.refusal}
    >
      <DropWell
        kind="image"
        ids={listOf(form.values.inputs[imageInput])}
        max={input.max}
        onChange={state.setImage}
        onMessage={setWellMessage}
        triggerRef={trigger}
        limits={assetLimitsText({
          formats: imageFormats,
          bytes: maxBytes,
          shortSide: minShortSide,
          longSide: maxLongSide,
        })}
      />
      {check.state === "unreadable" ? (
        <Button className="self-start" onClick={check.retry}>
          {t("state.tryAgain")}
        </Button>
      ) : null}
    </FieldFrame>
  )
}

function BackgroundField({
  state,
}: {
  state: BackgroundRemovalState
}): ReactElement | null {
  const input = choiceOf(state, backgroundInput)
  if (input === null) {
    return null
  }
  const value =
    textOf(state.form.values.inputs[backgroundInput]) || input.default
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={itemsOf(input)}
      value={value}
      onChange={(next) => state.form.setInput(backgroundInput, next)}
      note={tCatalog("backgroundRemoval.input.background.note")}
    />
  )
}

function ModelField({
  state,
}: {
  state: BackgroundRemovalState
}): ReactElement | null {
  const input = choiceOf(state, modelInput)
  if (input === null || input.options.length < 2) {
    return null
  }
  const value = textOf(state.form.values.inputs[modelInput]) || input.default
  const option = input.options.find((one) => one.value === value)
  return (
    <CollapsibleSection title={t("field.advanced")}>
      <ChoiceField
        label={inputCaption(input)}
        items={itemsOf(input)}
        value={value}
        onChange={(next) => state.form.setInput(modelInput, next)}
        note={
          option === undefined
            ? null
            : `${tCatalog(`${option.labelKey}.line`)} ${t("field.model.open")}`
        }
      />
    </CollapsibleSection>
  )
}

export function BackgroundRemovalPanel({
  state,
}: {
  state: BackgroundRemovalState
}): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <ImageWell state={state} />
      <BackgroundField state={state} />
      <ModelField state={state} />
    </div>
  )
}
