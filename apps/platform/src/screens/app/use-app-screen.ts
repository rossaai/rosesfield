import type { AppListing, Run } from "@rosesfield/contract"
import type { KeyboardEvent } from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import { valuesFromRun } from "@/screens/app/app-form"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"

export type AppScreenState = {
  form: AppForm
  start: StartRun
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

export function useAppScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted?: () => void
): AppScreenState {
  const form = useAppForm(app, seeds)
  const start = useStartRun(app, form, onStarted)
  const runs = useAppRuns(app)
  const lastSeed = runs.runs.find((run) => run.seed !== null)?.seed ?? null
  return {
    form,
    start,
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
