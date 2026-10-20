import type { AppListing, Run } from "@rosesfield/contract"
import { type KeyboardEvent, type ReactElement, useRef } from "react"
import { AppCanvas, useAppRuns } from "@/screens/app/app-canvas"
import { valuesFromRun } from "@/screens/app/app-form"
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
import {
  type MotionChecks,
  useMotionChecks,
} from "@/studio/motion/use-motion-checks"

type MotionState = {
  app: AppListing
  form: AppForm
  checks: MotionChecks
  start: StartRun
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  register: (name: string, focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function guarded(
  start: StartRun,
  checks: MotionChecks,
  focusers: ReadonlyMap<string, () => void>
): StartRun {
  return {
    ...start,
    generate: () => {
      if (checks.readingInput === null) {
        start.generate()
        return
      }
      focusers.get(checks.readingInput)?.()
    },
  }
}

function useMotionScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): MotionState {
  const form = useAppForm(app, seeds)
  const checks = useMotionChecks(form)
  const start = useStartRun(app, form, onStarted)
  const runs = useAppRuns(app)
  const focusers = useRef(new Map<string, () => void>())
  const safeStart = guarded(start, checks, focusers.current)
  return {
    app,
    form,
    checks,
    start: safeStart,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    register: (name, focus) => {
      focusers.current.set(name, focus)
      form.register(name, focus)
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        safeStart.generate()
      }
    },
  }
}

function MotionPanel({ state }: { state: MotionState }): ReactElement {
  const { app, form, checks } = state
  return (
    <div className="flex flex-col gap-s4">
      {app.inputs
        .filter((input) => input.type !== "seed")
        .map((input) => (
          <InputField
            key={input.name}
            app={app}
            input={input}
            value={form.values.inputs[input.name]}
            problem={
              checks.problems[input.name] ?? form.problems.get(input.name)
            }
            onChange={(value) => form.setInput(input.name, value)}
            register={(focus) => state.register(input.name, focus)}
          />
        ))}
      <AdvancedFields app={app} form={form} lastSeed={state.lastSeed} />
    </div>
  )
}

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const state = useMotionScreen(app, seeds, () => sheetClose.current())
  const sheet = useSheetOpen()
  sheetClose.current = () => sheet[1](false)
  return (
    <ColumnFrame
      app={app}
      start={state.start}
      onShortcut={state.onShortcut}
      sheet={sheet}
      panel={<MotionPanel state={state} />}
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
