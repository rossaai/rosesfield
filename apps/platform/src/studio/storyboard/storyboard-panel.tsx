import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { CharacterField } from "@/screens/app/fields/character-field"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { AspectField } from "@/screens/app/fields/output-fields"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { SceneList } from "@/studio/storyboard/scene-list"
import { formatFieldOf } from "@/studio/storyboard/storyboard-model"
import type { StoryboardState } from "@/studio/storyboard/use-storyboard-screen"
import { lookMaxLength } from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

type PanelProps = {
  app: AppListing
  state: StoryboardState
}

function inputNamed(app: AppListing, name: string): InputDefinition | null {
  return app.inputs.find((input) => input.name === name) ?? null
}

function ReferenceField({ state }: { state: StoryboardState }): ReactElement {
  const trigger = useRef<HTMLButtonElement>(null)
  const [wellMessage, setWellMessage] = useState<string | null>(null)
  const { register } = state
  useEffect(() => {
    register("reference")(() => trigger.current?.focus())
  }, [register])
  return (
    <FieldFrame
      caption={tCatalog("storyboard.input.reference.label")}
      isOptional
      note={tCatalog("storyboard.input.reference.note")}
      problem={undefined}
      message={wellMessage ?? state.messages.get("reference") ?? null}
    >
      <DropWell
        kind="image"
        ids={listOf(state.form.values.inputs.reference)}
        max={1}
        onChange={(ids) => state.form.setInput("reference", ids)}
        onMessage={setWellMessage}
        triggerRef={trigger}
      />
    </FieldFrame>
  )
}

function LookField({ state }: { state: StoryboardState }): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null)
  const { register } = state
  useEffect(() => {
    register("look")(() => field.current?.focus())
  }, [register])
  const text = textOf(state.form.values.inputs.look)
  return (
    <FieldFrame
      caption={tCatalog("storyboard.input.look.label")}
      isOptional
      note={
        text.length > lookMaxLength * 0.8
          ? t("field.prompt.count", { count: text.length, max: lookMaxLength })
          : tCatalog("storyboard.input.look.note")
      }
      problem={undefined}
      message={state.messages.get("look") ?? null}
    >
      <Textarea
        ref={field}
        value={text}
        placeholder={tCatalog("storyboard.input.look.placeholder")}
        onChange={(event) => state.form.setInput("look", event.target.value)}
        className="max-w-none"
      />
    </FieldFrame>
  )
}

function ModelField({ app, state }: PanelProps): ReactElement | null {
  if (state.model.isTaskApp || state.model.isLoading) {
    return <CatalogPicker hosted={state.model} place="row" />
  }
  const input = inputNamed(app, "model")
  if (input?.type !== "choice") {
    return null
  }
  const chosen = textOf(state.form.values.inputs.model)
  const items = input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
  const value = items.some((item) => item.value === chosen)
    ? chosen
    : input.default
  const picked = input.options.find((option) => option.value === value)
  const lineKey = picked === undefined ? null : `${picked.labelKey}.line`
  return (
    <ChoiceField
      label={tCatalog(input.labelKey)}
      items={items}
      value={value}
      onChange={(next) => state.form.setInput("model", next)}
      note={
        lineKey !== null && hasCatalogText(lineKey) ? tCatalog(lineKey) : null
      }
      register={(focus) => state.form.register("model", focus)}
    />
  )
}

function FormatField({ app, state }: PanelProps): ReactElement | null {
  const fields = state.model.chosen?.form ?? null
  if (fields === null) {
    return (
      <AspectField
        app={app}
        value={state.form.values.aspectRatio}
        onChange={(aspectRatio) => state.form.setForm({ aspectRatio })}
      />
    )
  }
  const field = formatFieldOf(fields)
  if (field === null) {
    return null
  }
  const held = state.form.values.inputs[field.name] ?? field.default
  const items = field.options.map((option) => ({
    value: String(option),
    label: String(option),
  }))
  return (
    <ChoiceField
      label={t("field.aspect.label")}
      items={items}
      value={held === null || held === undefined ? "" : String(held)}
      onChange={(next) => {
        const option = field.options.find((one) => String(one) === next)
        if (option !== undefined) {
          state.form.setInput(field.name, option)
        }
      }}
      note={null}
    />
  )
}

function CharacterInput({ app, state }: PanelProps): ReactElement | null {
  const input = inputNamed(app, "character")
  if (input?.type !== "character") {
    return null
  }
  return (
    <CharacterField
      app={app}
      input={input}
      value={state.form.values.inputs.character}
      problem={undefined}
      onChange={(value) => state.form.setInput("character", value)}
      register={state.register("character")}
    />
  )
}

export function StoryboardPanel({ app, state }: PanelProps): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <ReferenceField state={state} />
      <CharacterInput app={app} state={state} />
      <SceneList state={state} />
      <LookField state={state} />
      <ModelField app={app} state={state} />
      <FormatField app={app} state={state} />
      <AdvancedFields app={app} form={state.form} lastSeed={state.lastSeed} />
    </div>
  )
}
