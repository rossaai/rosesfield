import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AppCanvas, useAppRuns } from "@/screens/app/app-canvas"
import { type FieldProblem, valuesFromRun } from "@/screens/app/app-form"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import { listOf } from "@/screens/app/fields/field-props"
import { InputField } from "@/screens/app/fields/input-field"
import { CountField } from "@/screens/app/fields/output-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import { useRecordingLength } from "@/studio/voice/use-recording-length"
import {
  bodyAppFor,
  formAppFor,
  modeOf,
  panelInputsOf,
  recordingInput,
  recordingLengthProblem,
  type VoiceMode,
} from "@/studio/voice/voice-modes"

type VoiceState = {
  app: AppListing
  formApp: AppListing
  mode: VoiceMode
  form: AppForm
  start: StartRun
  lengthProblem: FieldProblem | undefined
  lastSeed: number | null
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function useLengthProblem(form: AppForm): FieldProblem | undefined {
  const [first = null] = listOf(form.values.inputs[recordingInput])
  const seconds = useRecordingLength(first)
  const [problem, setProblem] = useState<FieldProblem | undefined>()
  const { setInput } = form
  useEffect(() => {
    if (first === null || seconds === null) {
      return
    }
    const found = recordingLengthProblem(seconds)
    setProblem(found ?? undefined)
    if (found !== null) {
      setInput(recordingInput, [])
    }
  }, [first, seconds, setInput])
  return problem
}

function useVoiceScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): VoiceState & { useInputs: (run: Run) => void; hasRuns: boolean | null } {
  const [mode, setMode] = useState<VoiceMode>("model")
  const formApp = useMemo(() => formAppFor(app, mode), [app, mode])
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const form = useAppForm(formApp, seeds)
  const formMode = modeOf(form.values)
  useEffect(() => {
    setMode(formMode)
  }, [formMode])
  const start = useStartRun(bodyApp, form, onStarted)
  const lengthProblem = useLengthProblem(form)
  const runs = useAppRuns(app)
  return {
    app,
    formApp,
    mode,
    form,
    start,
    lengthProblem,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}

function VoiceField({
  state,
  input,
}: {
  state: VoiceState
  input: InputDefinition
}): ReactElement | null {
  const { form } = state
  const problem =
    form.problems.get(input.name) ??
    (input.name === recordingInput ? state.lengthProblem : undefined)
  return (
    <InputField
      app={state.app}
      input={input}
      value={form.values.inputs[input.name]}
      problem={problem}
      onChange={(value) => form.setInput(input.name, value)}
      register={(focus) => form.register(input.name, focus)}
    />
  )
}

function VoicePanel({ state }: { state: VoiceState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      {panelInputsOf(state.app, state.mode).map((input) => (
        <VoiceField key={input.name} state={state} input={input} />
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
    </div>
  )
}

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useVoiceScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen(state.hasRuns)
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<VoicePanel state={state} />}
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
