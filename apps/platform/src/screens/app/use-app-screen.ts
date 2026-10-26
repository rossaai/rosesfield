import type { AppListing, Run } from "@rosesfield/contract"
import { type KeyboardEvent, useRef } from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import { heldProblemsOf, valuesFromRun } from "@/screens/app/app-form"
import { hostedProblems } from "@/screens/app/hosted/hosted-form"
import {
  type HostedState,
  useHostedModel,
} from "@/screens/app/hosted/use-hosted-model"
import { usePriceRefresh } from "@/screens/app/hosted/use-price-refresh"
import {
  type AppForm,
  type FormCheck,
  useAppForm,
} from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"

export type AppScreenState = {
  form: AppForm
  start: StartRun
  hosted?: HostedState
  lastSeed: number | null
  hasRuns: boolean | null
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export type AppSeeds = {
  use: string | undefined
  from: string | undefined
  share?: string | undefined
  mode?: string | undefined
  open?: string | undefined
}

export const noSeeds: AppSeeds = { use: undefined, from: undefined }

export type ScreenStart = StartRun & { check?: FormCheck }

export type StartHook = (
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  onStarted?: (run: Run) => void
) => ScreenStart

function useHostedStart(
  app: AppListing,
  form: AppForm,
  hosted: HostedState,
  onStarted?: (run: Run) => void
): ScreenStart {
  return useStartRun(app, form, onStarted, hosted)
}

export function useAppScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted?: () => void,
  useStart: StartHook = useHostedStart
): AppScreenState {
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(app, seeds, check)
  const runs = useAppRuns(app)
  const hosted = useHostedModel(app, form)
  usePriceRefresh(app.id, runs.runs)
  const start = useStart(app, form, hosted, onStarted)
  const fields = hosted.fields
  check.current =
    start.check ??
    (fields === null
      ? (values) => heldProblemsOf(app, values)
      : (values) => hostedProblems(fields, values))
  const lastSeed = runs.runs.find((run) => run.seed !== null)?.seed ?? null
  return {
    form,
    start,
    hosted,
    lastSeed,
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
