import type { InputDefinition } from "@rosesfield/contract"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { aspectField } from "@/screens/app/app-form"
import { ChoiceControl } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import {
  AdvancedSection,
  AppSettingRow,
  settingId,
} from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import {
  type AppSetting,
  appSettingsPlan,
  isSettingInput,
} from "@/screens/app/settings-plan"
import { clipLimitsText } from "@/studio/video-edit/clip-limit"
import type { VideoEditState } from "@/studio/video-edit/use-video-edit-screen"
import {
  aspectInput,
  bodyAppFor,
  isVideoEditMode,
  modeInput,
  shownInputsOf,
  sourceInput,
} from "@/studio/video-edit/video-edit-modes"
import { tabsOf } from "@/studio/video-edit/video-edit-tabs"

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function useActiveTabInView(mode: string): RefObject<HTMLDivElement | null> {
  const holder = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const show = (): void => {
      const active = holder.current?.querySelector(
        `[data-slot='tabs-trigger'][data-value='${mode}']`
      )
      active?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
    }
    show()
    void document.fonts?.ready.then(show)
  }, [mode])
  return holder
}

export function ModeTabs({
  state,
}: {
  state: Pick<VideoEditState, "app" | "mode" | "setMode">
}): ReactElement {
  const tabs = tabsOf(state.app)
  const mode = state.app.inputs.find((input) => input.name === modeInput)
  const holder = useActiveTabInView(state.mode)
  return (
    <div ref={holder} data-slot="video-edit-tabs" className="min-w-0">
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
            <TabsTrigger key={tab.mode} value={tab.mode} data-value={tab.mode}>
              {tCatalog(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
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
    <div data-slot="clip-well">
      <FieldFrame
        caption={inputCaption(source)}
        isOptional={false}
        note={null}
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
          limits={[
            inputNote(state.app, source),
            clipLimitsText(state.clipLimit),
          ]
            .filter((one) => one !== null)
            .join(" ")}
        />
      </FieldFrame>
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
      note={null}
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

function InputRow({
  state,
  input,
}: {
  state: VideoEditState
  input: InputDefinition
}): ReactElement {
  const { form } = state
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

function SettingRows({
  state,
  settings,
}: {
  state: VideoEditState
  settings: readonly AppSetting[]
}): ReactNode {
  return settings.map((setting) =>
    setting.kind === "input" &&
    setting.input.name === aspectInput &&
    setting.input.type === "choice" ? (
      <FormatField
        key={settingId(setting)}
        state={state}
        input={setting.input}
      />
    ) : (
      <AppSettingRow
        key={settingId(setting)}
        app={state.app}
        form={state.form}
        lastSeed={state.lastSeed}
        setting={setting}
      />
    )
  )
}

function GraphSettings({ state }: { state: VideoEditState }): ReactNode {
  const plan = appSettingsPlan(bodyAppFor(state.app, state.mode), [
    modeInput,
    aspectField,
  ])
  return (
    <>
      <SettingRows state={state} settings={plan.main} />
      {plan.advanced.length === 0 ? null : (
        <AdvancedSection>
          <SettingRows state={state} settings={plan.advanced} />
        </AdvancedSection>
      )}
    </>
  )
}

function TabInputs({
  state,
  model,
}: {
  state: VideoEditState
  model: ReactNode
}): ReactElement {
  const fields = state.hosted.fields
  if (fields !== null) {
    return (
      <HostedFields
        fields={fields.filter((field) => field.name !== state.clipField.name)}
        form={state.form}
        app={state.app}
        model={model}
      />
    )
  }
  return (
    <>
      {shownInputsOf(state.app, state.mode)
        .filter((input) => !isSettingInput(input))
        .map((input) => (
          <InputRow key={input.name} state={state} input={input} />
        ))}
      {model}
      <GraphSettings state={state} />
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

export function VideoEditPanel({
  state,
}: {
  state: VideoEditState
}): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <ClipWell state={state} />
      <TabInputs
        state={state}
        model={
          state.hosted.isTaskApp ? (
            <CatalogPicker hosted={tabHostedOf(state)} place="row" />
          ) : null
        }
      />
    </div>
  )
}
