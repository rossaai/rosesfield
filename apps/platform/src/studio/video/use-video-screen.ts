import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import { useEffect, useMemo, useRef, useState } from "react"
import type { FieldValue } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import {
  hostedDefaults,
  modelInputName,
} from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  type AppScreenState,
  type AppSeeds,
  useAppScreen,
} from "@/screens/app/use-app-screen"
import { chipDefaultsOf, type VideoFields } from "@/studio/video/video-fields"
import {
  composePrompt,
  type Preset,
  presetsOf,
  splitPrompt,
  typedPrompt,
} from "@/studio/video/video-prompt"
import { graphPrompt, restoredOf } from "@/studio/video/video-restore"
import {
  defaultsOfTab,
  fieldsOfModel,
  imagesForTab,
  modelForTab,
  modelsOfTab,
  type VideoTab,
} from "@/studio/video/video-tabs"

export type VideoPrompt = {
  name: string
  typed: string
  move: string | null
  setTyped: (typed: string) => void
  setMove: (move: string | null) => void
}

export type VideoScreen = {
  state: AppScreenState
  hosted: HostedState
  tab: VideoTab
  setTab: (tab: VideoTab) => void
  fields: VideoFields | null
  isGraph: boolean
  presets: readonly Preset[]
  prompt: VideoPrompt
  fillFromRun: (run: Run) => void
}

function emptyHosted(): HostedState {
  return {
    isTaskApp: false,
    models: [],
    isLoading: false,
    error: null,
    keyState: "unknown",
    defaultModel: null,
    chosen: null,
    fields: null,
    choose: () => undefined,
  }
}

function missingOf(
  fields: VideoFields,
  form: AppForm
): Record<string, string | number | string[]> {
  const { inputs } = form.values
  const all = [
    fields.length,
    fields.aspect,
    fields.resolution,
    ...fields.required,
    ...fields.rest,
  ].filter((field): field is ModelField => field !== null)
  const defaults = hostedDefaults(all, inputs)
  const missing: Record<string, string | number | string[]> = {}
  for (const field of all) {
    const value = defaults[field.name]
    if (inputs[field.name] === undefined && value !== undefined) {
      missing[field.name] = value
    }
  }
  return { ...missing, ...chipDefaultsOf(fields, { ...inputs, ...missing }) }
}

function useChipDefaults(form: AppForm, fields: VideoFields | null): void {
  const { setForm, values } = form
  useEffect(() => {
    if (fields === null) {
      return
    }
    const fixes = missingOf(fields, form)
    if (Object.keys(fixes).length > 0) {
      setForm({ inputs: { ...values.inputs, ...fixes } })
    }
  })
}

type Restore = (
  inputs: Readonly<Record<string, FieldValue>>,
  model: CatalogModel | null
) => void

function useRestoreOnSeed(
  form: AppForm,
  hosted: HostedState,
  restore: Restore
): void {
  const done = useRef(false)
  useEffect(() => {
    if (done.current || form.source !== "seed" || hosted.isLoading) {
      return
    }
    done.current = true
    restore(form.values.inputs, hosted.chosen)
  })
}

function useVideoPrompt(
  form: AppForm,
  fields: VideoFields | null,
  presets: readonly Preset[]
): VideoPrompt {
  const name = fields?.prompt?.name ?? graphPrompt
  const current = textOf(form.values.inputs[name])
  const split = splitPrompt(current, presets)
  return {
    name,
    typed: split.typed,
    move: split.move,
    setTyped: (typed) =>
      form.setInput(name, typedPrompt(current, typed, presets)),
    setMove: (move) =>
      form.setInput(name, composePrompt(split.typed, move, presets)),
  }
}

export function useVideoScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted: () => void
): VideoScreen {
  const state = useAppScreen(app, seeds, onStarted)
  const hosted = state.hosted ?? emptyHosted()
  const [tab, setTabState] = useState<VideoTab>("text-image")
  const presets = useMemo(() => presetsOf(app.id), [app.id])
  const fields = useMemo(() => fieldsOfModel(hosted.chosen), [hosted.chosen])
  const isGraph = hosted.chosen !== null && hosted.chosen.form === null
  useChipDefaults(state.form, fields)
  const prompt = useVideoPrompt(state.form, fields, presets)
  const { form } = state
  const setTab = (next: VideoTab): void => {
    setTabState(next)
    const chosen = textOf(form.values.inputs[modelInputName]) || null
    const id = modelForTab(modelsOfTab(hosted.models, next, app), chosen, [
      ...defaultsOfTab(next),
      hosted.defaultModel,
    ])
    if (id !== null && id !== hosted.chosen?.id) {
      hosted.choose(id)
      return
    }
    const trimmed = imagesForTab(fields, next, form.values.inputs)
    if (Object.keys(trimmed).length > 0) {
      form.setForm({ inputs: { ...form.values.inputs, ...trimmed } })
    }
  }
  const restore: Restore = (inputs, model) => {
    const restored = restoredOf(inputs, model, presets, app)
    for (const [name, value] of Object.entries(restored.inputs)) {
      form.setInput(name, value)
    }
    setTabState(restored.tab)
  }
  useRestoreOnSeed(form, hosted, restore)
  const fillForm = state.useInputs
  const fillFromRun = (run: Run): void => {
    fillForm(run)
    restore(
      run.inputs,
      hosted.models.find((one) => one.id === run.inputs[modelInputName]) ?? null
    )
  }
  return {
    state,
    hosted,
    tab,
    setTab,
    fields,
    isGraph,
    presets,
    prompt,
    fillFromRun,
  }
}
