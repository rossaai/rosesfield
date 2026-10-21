import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import { useRouterState } from "@tanstack/react-router"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type FieldProblem,
  type FormValues,
  heldProblemsOf,
  valuesFromRun,
} from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
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
import type { AppSeeds } from "@/screens/app/use-app-screen"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import { bodyAppFor, formAppFor } from "@/studio/audio/audio-modes"
import {
  defaultTabOf,
  isOnTab,
  modeInput,
  modelForTab,
  tabOfHash,
  tabsOf,
} from "@/studio/audio/audio-tabs"
import { useLengthProblem } from "@/studio/audio/use-length-problem"

export type AudioState = {
  app: AppListing
  formApp: AppListing
  tab: string
  setTab: (tab: string) => void
  choose: (id: string) => void
  form: AppForm
  start: StartRun
  hosted: HostedState
  lastSeed: number | null
  lengthProblem: FieldProblem | undefined
  fillFromRun: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export function promptNameOf(
  model: CatalogModel | null,
  app: AppListing
): string | null {
  if (model?.form !== null && model?.form !== undefined) {
    return model.form.find((field) => field.kind === "prompt")?.name ?? null
  }
  return app.inputs.find((input) => input.type === "prompt")?.name ?? null
}

export function tabOfRun(
  app: AppListing,
  values: FormValues,
  models: readonly CatalogModel[]
): string | null {
  const tabs = tabsOf(app).map((tab) => tab.value)
  const mode = values.inputs[modeInput]
  if (typeof mode === "string" && tabs.includes(mode)) {
    return mode
  }
  const id = textOf(values.inputs[modelInputName])
  const task = models.find((model) => model.id === id)?.task
  return task !== undefined && tabs.includes(task) ? task : null
}

function chooserOf(
  app: AppListing,
  tab: string,
  form: AppForm,
  hosted: HostedState
): (id: string) => void {
  return (id) => {
    const from = promptNameOf(hosted.chosen, bodyAppFor(app, tab))
    const script = from === null ? "" : textOf(form.values.inputs[from])
    const next = hosted.models.find((model) => model.id === id) ?? null
    const to = promptNameOf(next, bodyAppFor(app, tab))
    hosted.choose(id)
    form.setInput(modeInput, tab)
    if (to !== null && script !== "") {
      form.setInput(to, script)
    }
  }
}

function useTabSync(
  app: AppListing,
  tab: string,
  setTab: (tab: string) => void,
  form: AppForm,
  hosted: HostedState,
  choose: (id: string) => void
): void {
  const seedPending = useRef(true)
  const chosenId = hosted.chosen?.id ?? null
  const formTab = form.values.inputs[modeInput]
  useEffect(() => {
    if (seedPending.current && form.source === "seed") {
      const seeded = tabOfRun(app, form.values, hosted.models)
      if (seeded !== null || !hosted.isLoading) {
        seedPending.current = false
        if (seeded !== null && seeded !== tab) {
          setTab(seeded)
          return
        }
      }
    }
    if (formTab !== tab) {
      form.setInput(modeInput, tab)
    }
    const isOff = !isOnTab(hosted.models, tab, app, chosenId)
    if (hosted.models.length > 0 && isOff) {
      const id = modelForTab(hosted.models, tab, app, [hosted.defaultModel])
      if (id !== null) {
        choose(id)
      }
    }
  })
}

export function useAudioScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted: () => void
): AudioState {
  const hash = useRouterState({ select: (state) => state.location.hash })
  const [tab, setTab] = useState(
    () => tabOfHash(app, hash) ?? defaultTabOf(app)
  )
  const formApp = useMemo(() => formAppFor(app, tab), [app, tab])
  const bodyApp = useMemo(() => bodyAppFor(app, tab), [app, tab])
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(formApp, seeds, check)
  const runs = useAppRuns(app)
  const hosted = useHostedModel(app, form, runs.runs)
  usePriceRefresh(app.id, runs.runs)
  const lengthProblem = useLengthProblem(app, tab, form)
  const fields = hosted.fields
  check.current =
    fields === null
      ? (values) => heldProblemsOf(formApp, values)
      : (values) => hostedProblems(fields, values)
  const start = useStartRun(bodyApp, form, onStarted, hosted)
  const choose = chooserOf(app, tab, form, hosted)
  useTabSync(app, tab, setTab, form, hosted, choose)
  return {
    app,
    formApp,
    tab,
    setTab,
    choose,
    form,
    start,
    hosted,
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    lengthProblem,
    fillFromRun: (run) => {
      const values = valuesFromRun(app, run)
      form.fill(values)
      setTab(tabOfRun(app, values, hosted.models) ?? tab)
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        start.generate()
      }
    },
  }
}
