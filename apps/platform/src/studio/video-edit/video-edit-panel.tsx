import type { InputDefinition } from "@rosesfield/contract"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { formatDuration } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { ChoiceControl } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { SeedField } from "@/screens/app/fields/seed-field"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { randomSeed } from "@/screens/app/inputs-panel"
import { clipLimitsText } from "@/studio/video-edit/clip-limit"
import type { VideoEditState } from "@/studio/video-edit/use-video-edit-screen"
import {
  advancedInputsOf,
  aspectInput,
  hasSeed,
  isVideoEditMode,
  modeInput,
  seedInput,
  shownInputsOf,
  sourceInput,
} from "@/studio/video-edit/video-edit-modes"
import { tabsOf } from "@/studio/video-edit/video-edit-tabs"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

export function ModeTabs({
  state,
}: {
  state: Pick<VideoEditState, "app" | "mode" | "setMode">
}): ReactElement {
  const tabs = tabsOf(state.app)
  const mode = state.app.inputs.find((input) => input.name === modeInput)
  return (
    <Tabs
      value={state.mode}
      onValueChange={(next) => {
        if (isVideoEditMode(next)) {
          state.setMode(next)
        }
      }}
    >
      <TabsList
        aria-label={mode === undefined ? undefined : inputCaption(mode)}
      >
        {tabs.map((tab) => (
          <TabsTrigger key={tab.mode} value={tab.mode}>
            {tCatalog(tab.labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function ClipWell({ state }: { state: VideoEditState }): ReactElement | null {
  const trigger = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { form, register, clipField } = state
  const name = clipField.name
  useEffect(() => {
    register(name, () => trigger.current?.focus())
  }, [name, register])
  const source = state.app.inputs.find((input) => input.name === sourceInput)
  if (source === undefined) {
    return null
  }
  const problem = form.problems.get(name) ?? state.clipProblem
  return (
    <div data-slot="clip-well" className="flex flex-col gap-s1_5">
      <FieldFrame
        caption={inputCaption(source)}
        isOptional={false}
        note={inputNote(state.app, source)}
        problem={problem}
        message={message}
      >
        <DropWell
          kind="video"
          ids={listOf(form.values.inputs[name])}
          max={1}
          onChange={(ids) => form.setInput(name, ids)}
          onMessage={setMessage}
          triggerRef={trigger}
          limits={clipLimitsText(state.clipLimit)}
        />
      </FieldFrame>
      {state.clip === null || problem !== undefined ? null : (
        <p className="text-caption text-ink-muted">
          {formatDuration(state.clip.seconds)}
        </p>
      )}
    </div>
  )
}

function FormatField({
  state,
  input,
}: {
  state: VideoEditState
  input: ChoiceInput
}): ReactElement {
  const items = input.options.map((option) => ({
    value: option.value,
    label: tCatalog(option.labelKey),
  }))
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={false}
      note={inputNote(state.app, input)}
      problem={undefined}
      message={
        state.isSameFormat ? tCatalog("video-edit.input.aspect.same") : null
      }
    >
      <ChoiceControl
        label={inputCaption(input)}
        items={items}
        value={textOf(state.form.values.inputs[input.name]) || input.default}
        onChange={(value) => state.form.setInput(input.name, value)}
        register={(focus) => state.register(input.name, focus)}
      />
    </FieldFrame>
  )
}

function EditField({
  state,
  input,
}: {
  state: VideoEditState
  input: InputDefinition
}): ReactElement {
  const { form } = state
  if (input.name === aspectInput && input.type === "choice") {
    return <FormatField state={state} input={input} />
  }
  return (
    <InputField
      app={state.app}
      input={input}
      value={form.values.inputs[input.name]}
      problem={form.problems.get(input.name)}
      onChange={(value) => form.setInput(input.name, value)}
      register={(focus) => state.register(input.name, focus)}
    />
  )
}

function AdvancedSection({
  state,
}: {
  state: VideoEditState
}): ReactElement | null {
  const inputs = advancedInputsOf(state.app, state.mode)
  if (inputs.length === 0 && !hasSeed(state.mode)) {
    return null
  }
  const { form } = state
  const seed = form.values.inputs[seedInput]
  return (
    <CollapsibleSection title={t("field.advanced")}>
      {inputs.map((input) => (
        <EditField key={input.name} state={state} input={input} />
      ))}
      {hasSeed(state.mode) ? (
        <SeedField
          mode={form.values.seedMode}
          value={seed}
          onMode={(mode) => {
            form.setForm({ seedMode: mode })
            if (mode === "fixed" && typeof seed !== "number") {
              form.setInput(seedInput, state.lastSeed ?? randomSeed())
            }
          }}
          onChange={(next) => form.setInput(seedInput, next)}
        />
      ) : null}
    </CollapsibleSection>
  )
}

function TabInputs({ state }: { state: VideoEditState }): ReactElement {
  const fields = state.hosted.fields
  if (fields !== null) {
    return (
      <HostedFields
        fields={fields.filter((field) => field.name !== state.clipField.name)}
        form={state.form}
      />
    )
  }
  return (
    <>
      {shownInputsOf(state.app, state.mode).map((input) => (
        <EditField key={input.name} state={state} input={input} />
      ))}
      <AdvancedSection state={state} />
    </>
  )
}

export function tabHostedOf(
  state: Pick<VideoEditState, "hosted" | "tabModels" | "chooseModel">
): HostedState {
  return {
    ...state.hosted,
    models: state.tabModels,
    choose: state.chooseModel,
  }
}

function ModelRow({ state }: { state: VideoEditState }): ReactElement | null {
  return state.hosted.isTaskApp ? (
    <CatalogPicker hosted={tabHostedOf(state)} place="row" />
  ) : null
}

export function VideoEditPanel({
  state,
}: {
  state: VideoEditState
}): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <ClipWell state={state} />
      <TabInputs state={state} />
      <ModelRow state={state} />
    </div>
  )
}
