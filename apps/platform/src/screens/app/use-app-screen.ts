import type { AppListing, Run } from "@rosesfield/contract"
import { type KeyboardEvent, useRef } from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  defaultsOf,
  type FormValues,
  valuesFromRun,
} from "@/screens/app/app-form"
import {
  hostedProblems,
  modelInputName,
} from "@/screens/app/hosted/hosted-form"
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
}

export const noSeeds: AppSeeds = { use: undefined, from: undefined }

function hostedValuesFromRun(app: AppListing, run: Run): FormValues | null {
  const model = run.inputs[modelInputName]
  if (typeof model !== "string" || !model.includes("/")) {
    return null
  }
  return { ...defaultsOf(app), inputs: { ...run.inputs } }
}

export function useAppScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted?: () => void
): AppScreenState {
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(app, seeds, check)
  const runs = useAppRuns(app)
  const hosted = useHostedModel(app, form, runs.runs)
  usePriceRefresh(app.id, runs.runs)
  const fields = hosted.fields
  check.current =
    fields === null ? null : (values) => hostedProblems(fields, values)
  const start = useStartRun(app, form, onStarted, hosted)
  const lastSeed = runs.runs.find((run) => run.seed !== null)?.seed ?? null
  return {
    form,
    start,
    hosted,
    lastSeed,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    useInputs: (run) =>
      form.fill(hostedValuesFromRun(app, run) ?? valuesFromRun(app, run)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}
