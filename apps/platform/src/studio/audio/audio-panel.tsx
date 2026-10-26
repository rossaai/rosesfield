import type { InputDefinition } from "@rosesfield/contract"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import type { ReactElement, ReactNode } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { tCatalog } from "@/copy/t"
import { countField, type FieldValue } from "@/screens/app/app-form"
import { InputField } from "@/screens/app/fields/input-field"
import { AppSettingsSection } from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { trayInputsOf } from "@/screens/app/inputs-panel"
import { appSettingsPlan } from "@/screens/app/settings-plan"
import { bodyAppFor, recordingOf } from "@/studio/audio/audio-modes"
import {
  modeInput,
  modeInputOf,
  modelsOfTab,
  tabsOf,
} from "@/studio/audio/audio-tabs"
import { RecordingField } from "@/studio/audio/recording-field"
import type { AudioState } from "@/studio/audio/use-audio-screen"
import { foldSettings, hasModelChoice } from "@/studio/edit/edit-form"

type TabsView = Pick<AudioState, "app" | "tab" | "setTab">

const foldedSettings: readonly string[] = [countField, "expression"]

export function audioTabRowOf(state: TabsView): ReactElement | undefined {
  return tabsOf(state.app).length > 1 && modeInputOf(state.app) !== null ? (
    <AudioTabs state={state} />
  ) : undefined
}

export function AudioTabs({ state }: { state: TabsView }): ReactElement | null {
  const tabs = tabsOf(state.app)
  const input = modeInputOf(state.app)
  if (input === null || tabs.length < 2) {
    return null
  }
  return (
    <Tabs
      value={state.tab}
      onValueChange={(next) => {
        const found = tabs.find((tab) => tab.value === next)
        if (found !== undefined) {
          state.setTab(found.value)
        }
      }}
    >
      <TabsList aria-label={tCatalog(input.labelKey)}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tCatalog(tab.labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function AudioField({
  state,
  input,
}: {
  state: AudioState
  input: InputDefinition
}): ReactElement | null {
  const { form } = state
  const problem =
    form.problems.get(input.name) ??
    (input.name === recordingOf(state.app, state.tab)
      ? state.lengthProblem
      : undefined)
  const props = {
    app: state.formApp,
    value: form.values.inputs[input.name],
    problem,
    onChange: (value: FieldValue) => form.setInput(input.name, value),
    register: (focus: () => void) => form.register(input.name, focus),
  }
  return input.type === "audio" && isAssetInput(input) ? (
    <RecordingField {...props} input={input} />
  ) : (
    <InputField {...props} input={input} />
  )
}

function GraphFields({
  state,
  model,
}: {
  state: AudioState
  model: ReactNode
}): ReactElement {
  const body = bodyAppFor(state.app, state.tab)
  return (
    <>
      {trayInputsOf(body).map((input) => (
        <AudioField key={input.name} state={state} input={input} />
      ))}
      {model}
      <AppSettingsSection
        app={state.formApp}
        form={state.form}
        lastSeed={state.lastSeed}
        plan={foldSettings(appSettingsPlan(body, [modeInput]), foldedSettings)}
      />
    </>
  )
}

export function AudioPanel({ state }: { state: AudioState }): ReactElement {
  const { hosted } = state
  const tabHosted = {
    ...hosted,
    models: modelsOfTab(hosted.models, state.tab, state.app),
    choose: state.choose,
  }
  const model = hasModelChoice(tabHosted) ? (
    <CatalogPicker hosted={tabHosted} place="row" />
  ) : null
  return hosted.fields === null ? (
    <div className="flex flex-col gap-s4">
      <GraphFields state={state} model={model} />
    </div>
  ) : (
    <HostedFields
      fields={hosted.fields}
      form={state.form}
      app={state.app}
      model={model}
    />
  )
}
