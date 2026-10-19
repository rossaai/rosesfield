import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { t, tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { CharacterField } from "@/screens/app/fields/character-field"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { AspectField } from "@/screens/app/fields/output-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { SceneList } from "@/studio/storyboard/scene-list"
import type { StoryboardState } from "@/studio/storyboard/use-storyboard-screen"
import {
  lookMaxLength,
  modelKeyOf,
  type StoryboardModel,
  storyboardModels,
} from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

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

function isModel(value: unknown): value is StoryboardModel {
  return storyboardModels.some((model) => model === value)
}

function ModelField({ state }: { state: StoryboardState }): ReactElement {
  const chosen = state.form.values.inputs.model
  const value = isModel(chosen) ? chosen : "qwen-image-edit-2511"
  const key = modelKeyOf(value)
  return (
    <ChoiceField
      label={tCatalog("storyboard.input.model.label")}
      items={storyboardModels.map((model) => ({
        value: model,
        label: tCatalog(`storyboard.model.${modelKeyOf(model)}`),
      }))}
      value={value}
      onChange={(next) => {
        if (isModel(next)) {
          state.form.setInput("model", next)
        }
      }}
      note={`${tCatalog(`storyboard.model.${key}.line`)} ${tCatalog("storyboard.model.limits")}`}
      register={(focus) => state.form.register("model", focus)}
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
      <ModelField state={state} />
      <AspectField
        app={app}
        value={state.form.values.aspectRatio}
        onChange={(aspectRatio) => state.form.setForm({ aspectRatio })}
      />
      <AdvancedFields app={app} form={state.form} lastSeed={state.lastSeed} />
    </div>
  )
}
