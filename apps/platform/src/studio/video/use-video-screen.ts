import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import { useEffect, useMemo, useState } from "react"
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
  movedPrompt,
  type Preset,
  presetsOf,
  splitPrompt,
  typedPrompt,
} from "@/studio/video/video-prompt"
import {
  fieldsOfModel,
  imagesForTab,
  modelForTab,
  modelsOfTab,
  tabOfRun,
  type VideoTab,
} from "@/studio/video/video-tabs"

const graphPrompt = "prompt"
const cameraMoveInput = "cameraMove"
const autoMove = "auto"

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
    ranBefore: [],
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
    const id = modelForTab(
      modelsOfTab(hosted.models, next),
      chosen ?? hosted.defaultModel,
      hosted.defaultModel
    )
    if (id !== null && id !== hosted.chosen?.id) {
      hosted.choose(id)
      return
    }
    const trimmed = imagesForTab(fields, next, form.values.inputs)
    if (Object.keys(trimmed).length > 0) {
      form.setForm({ inputs: { ...form.values.inputs, ...trimmed } })
    }
  }
  const fillForm = state.useInputs
  const fillFromRun = (run: Run): void => {
    const model = hosted.models.find((one) => one.id === run.inputs.model)
    fillForm(run)
    const name = fieldsOfModel(model ?? null)?.prompt?.name ?? graphPrompt
    const move = run.inputs[cameraMoveInput]
    const written = textOf(run.inputs[name])
    const moved = movedPrompt(written, move, presets)
    if (moved !== written) {
      form.setInput(name, moved)
      form.setInput(cameraMoveInput, autoMove)
    }
    setTabState(tabOfRun(run, model ?? null))
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
