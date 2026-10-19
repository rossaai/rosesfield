import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { formatDuration } from "@/copy/format"
import { assetLimitsText } from "@/pieces/asset-limits"
import { useAppRuns } from "@/screens/app/app-canvas"
import { type FieldProblem, valuesFromRun } from "@/screens/app/app-form"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import { InputField } from "@/screens/app/fields/input-field"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import { RecastCanvas } from "@/studio/recast/recast-canvas"
import {
  clipMimes,
  largestClipBytes,
  type ReadClip,
} from "@/studio/recast/recast-checks"
import {
  bodyAppFor,
  formAppFor,
  modeOf,
  type RecastMode,
  shownInputsOf,
  sourceInput,
} from "@/studio/recast/recast-modes"
import {
  longestClipSeconds,
  shortestClipSeconds,
} from "@/studio/recast/use-clip-facts"
import { useRecastClip } from "@/studio/recast/use-recast-clip"

type RecastState = {
  app: AppListing
  formApp: AppListing
  mode: RecastMode
  form: AppForm
  start: StartRun
  clip: ReadClip | null
  clipProblem: FieldProblem | undefined
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  registerSource: (focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function useRecastScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): RecastState {
  const [mode, setMode] = useState<RecastMode>("character")
  const formApp = useMemo(() => formAppFor(app, mode), [app, mode])
  const bodyApp = useMemo(() => bodyAppFor(app, mode), [app, mode])
  const form = useAppForm(formApp, seeds)
  const formMode = modeOf(form.values)
  useEffect(() => {
    setMode(formMode)
  }, [formMode])
  const started = useStartRun(bodyApp, form, onStarted)
  const { clip, clipProblem, isRead } = useRecastClip(form, app)
  const focusSource = useRef<() => void>(() => undefined)
  const checked: StartRun = {
    ...started,
    generate: () => {
      if (clipProblem !== undefined) {
        focusSource.current()
        return
      }
      started.generate()
    },
  }
  const start = useCheckedStart(checked, form, isRead, () => undefined)
  const runs = useAppRuns(app)
  return {
    app,
    formApp,
    mode,
    form,
    start,
    clip,
    clipProblem,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    registerSource: (focus) => {
      focusSource.current = focus
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}

function ClipLine({ state }: { state: RecastState }): ReactElement | null {
  if (state.clipProblem !== undefined) {
    return null
  }
  const text =
    state.clip === null
      ? assetLimitsText({
          formats: clipMimes,
          bytes: largestClipBytes,
          seconds: { min: shortestClipSeconds, max: longestClipSeconds },
        })
      : formatDuration(state.clip.seconds)
  return <p className="text-caption text-ink-muted">{text}</p>
}

function RecastField({
  state,
  input,
}: {
  state: RecastState
  input: InputDefinition
}): ReactElement {
  const { form } = state
  const isSource = input.name === sourceInput
  const problem =
    form.problems.get(input.name) ?? (isSource ? state.clipProblem : undefined)
  return (
    <div className="flex flex-col gap-s1_5">
      <InputField
        app={state.formApp}
        input={input}
        value={form.values.inputs[input.name]}
        problem={problem}
        onChange={(value) => form.setInput(input.name, value)}
        register={(focus) => {
          form.register(input.name, focus)
          if (isSource) {
            state.registerSource(focus)
          }
        }}
      />
      {isSource ? <ClipLine state={state} /> : null}
    </div>
  )
}

function RecastPanel({ state }: { state: RecastState }): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      {shownInputsOf(state.app, state.mode).map((input) => (
        <RecastField key={input.name} state={state} input={input} />
      ))}
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
  const state = useRecastScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen(state.hasRuns)
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<RecastPanel state={state} />}
      canvas={(openInputs) => (
        <RecastCanvas
          app={app}
          onUseInputs={state.useInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}
