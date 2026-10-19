import type { InputDefinition } from "@rosesfield/contract"
import { type ReactElement, useRef } from "react"
import { t, tCatalog } from "@/copy/t"
import { AppCanvas } from "@/screens/app/app-canvas"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import { ChoiceControl, ChoiceField } from "@/screens/app/fields/choice-field"
import { InputField } from "@/screens/app/fields/input-field"
import { aspectItems } from "@/screens/app/fields/output-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import {
  audioInput,
  clipInput,
  modeInput,
  photoInput,
  shownInputsOf,
} from "@/studio/lipsync/lipsync-modes"
import {
  autoAspect,
  type LipsyncState,
  useLipsyncScreen,
} from "@/studio/lipsync/use-lipsync-screen"

const wellInputs: readonly string[] = [photoInput, clipInput, audioInput]

function LipsyncField({
  state,
  input,
}: {
  state: LipsyncState
  input: InputDefinition
}): ReactElement {
  const { form } = state
  if (input.type === "choice" && input.name === modeInput) {
    return (
      <ChoiceControl
        label={tCatalog(input.labelKey)}
        items={input.options.map((option) => ({
          value: option.value,
          label: tCatalog(option.labelKey),
        }))}
        value={state.mode}
        onChange={(value) => form.setInput(input.name, value)}
      />
    )
  }
  const isWell = wellInputs.includes(input.name)
  const problem = state.problems[input.name] ?? form.problems.get(input.name)
  return (
    <InputField
      app={state.formApp}
      input={input}
      value={form.values.inputs[input.name]}
      problem={problem}
      onChange={(value) => form.setInput(input.name, value)}
      register={(focus) => {
        form.register(input.name, focus)
        if (isWell) {
          state.registerWell(input.name, focus)
        }
      }}
    />
  )
}

function FormatField({ state }: { state: LipsyncState }): ReactElement | null {
  if (state.mode !== "photo") {
    return null
  }
  const items = [
    { value: autoAspect, label: t("choice.auto") },
    ...aspectItems(state.app),
  ]
  return (
    <ChoiceField
      label={tCatalog("lipsync.input.aspect.label")}
      items={items}
      value={state.aspect}
      onChange={state.setAspect}
      note={tCatalog(
        state.aspect === autoAspect
          ? "lipsync.input.aspect.autoNote"
          : "lipsync.input.aspect.note"
      )}
    />
  )
}

function LipsyncPanel({ state }: { state: LipsyncState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      {shownInputsOf(state.app, state.mode).map((input) => (
        <LipsyncField key={input.name} state={state} input={input} />
      ))}
      <FormatField state={state} />
      <AdvancedFields
        app={state.formApp}
        form={state.form}
        lastSeed={state.lastSeed}
      />
    </div>
  )
}

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useLipsyncScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen(state.hasRuns)
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<LipsyncPanel state={state} />}
      canvas={(openInputs) => (
        <AppCanvas
          app={app}
          order="newest-first"
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
