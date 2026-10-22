import type { InputDefinition } from "@rosesfield/contract"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import type { ReactElement } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { InputField } from "@/screens/app/fields/input-field"
import { CountField } from "@/screens/app/fields/output-fields"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { panelInputsOf, recordingOf } from "@/studio/audio/audio-modes"
import { modeInputOf, modelsOfTab, tabsOf } from "@/studio/audio/audio-tabs"
import { RecordingField } from "@/studio/audio/recording-field"
import type { AudioState } from "@/studio/audio/use-audio-screen"

export function AudioTabs({
  state,
}: {
  state: Pick<AudioState, "app" | "tab" | "setTab">
}): ReactElement | null {
  const tabs = tabsOf(state.app)
  const input = modeInputOf(state.app)
  if (input === null || tabs.length === 0) {
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

function GraphFields({ state }: { state: AudioState }): ReactElement {
  return (
    <>
      {panelInputsOf(state.app, state.tab).map((input) => (
        <AudioField key={input.name} state={state} input={input} />
      ))}
      <CountField
        app={state.app}
        value={state.form.values.count}
        onChange={(count) => state.form.setForm({ count })}
      />
      <AdvancedFields
        app={state.formApp}
        form={state.form}
        lastSeed={state.lastSeed}
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
  return (
    <div className="flex flex-col gap-s4">
      <CatalogPicker hosted={tabHosted} place="row" />
      {hosted.fields === null ? (
        <GraphFields state={state} />
      ) : (
        <HostedFields fields={hosted.fields} form={state.form} />
      )}
    </div>
  )
}
