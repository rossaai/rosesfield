import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import { useEffect, useMemo, useState } from "react"
import { textOf } from "@/screens/app/fields/field-props"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  type AppScreenState,
  type AppSeeds,
  useAppScreen,
} from "@/screens/app/use-app-screen"
import {
  graphPromptInput,
  type ShotScene,
  sceneInput,
  sceneOf,
  shotInputsOf,
  splitWords,
  wordsOf,
} from "@/studio/shot/shot-prompt"
import { pickerModelsOf } from "@/studio/video/picker-models"
import { chipDefaultsOf, type VideoFields } from "@/studio/video/video-fields"
import {
  fieldsOfModel,
  type ImageSlots,
  slotsOf,
  startFrameInput,
} from "@/studio/video/video-tabs"

export type ShotScreen = {
  state: AppScreenState
  hosted: HostedState
  picker: HostedState
  fields: VideoFields | null
  isGraph: boolean
  promptName: string
  shot: ShotScene
  words: string
  start: ImageSlots["start"]
  filled: number
  setScene: (scene: string) => void
  setChoice: (list: string, value: string) => void
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

export function startSlotOf(
  app: AppListing,
  fields: VideoFields | null,
  isGraph: boolean
): ImageSlots["start"] {
  if (!isGraph) {
    return slotsOf(fields, "text-image").start
  }
  return app.inputs.some(
    (input) => input.name === startFrameInput && input.type === "image"
  )
    ? { name: startFrameInput, max: 1 }
    : null
}

export function shotPickerOf(
  hosted: HostedState,
  app: AppListing
): HostedState {
  return {
    ...hosted,
    models: pickerModelsOf(hosted.models, "text-image", app),
  }
}

export function useWordsInPrompt(
  form: AppForm,
  promptName: string,
  fields: VideoFields | null
): void {
  const { values, setInput } = form
  const { inputs } = values
  useEffect(() => {
    if (typeof inputs[sceneInput] !== "string") {
      const restored = shotInputsOf(sceneOf(inputs, promptName))
      for (const [name, value] of Object.entries(restored)) {
        setInput(name, value)
      }
      return
    }
    const shot = sceneOf(inputs, promptName)
    const words = wordsOf(shot.scene, shot.choices)
    if (textOf(inputs[promptName]) !== words) {
      setInput(promptName, words)
    }
    const fixes = fields === null ? {} : chipDefaultsOf(fields, inputs)
    for (const [name, value] of Object.entries(fixes)) {
      setInput(name, value)
    }
  }, [inputs, promptName, fields, setInput])
}

export function keepScene(form: AppForm, shot: ShotScene): void {
  for (const [name, value] of Object.entries(shotInputsOf(shot))) {
    form.setInput(name, value)
  }
}

export function chooseKeeping(
  form: AppForm,
  promptName: string,
  choose: (id: string) => void
): (id: string) => void {
  return (id) => {
    const held = sceneOf(form.values.inputs, promptName)
    choose(id)
    keepScene(form, held)
  }
}

export function sceneOfRun(
  run: Run,
  models: readonly CatalogModel[]
): ShotScene {
  const model = models.find((one) => one.id === run.inputs.model) ?? null
  const name = fieldsOfModel(model)?.prompt?.name ?? graphPromptInput
  const prompt = run.inputs[name]
  return splitWords(typeof prompt === "string" ? prompt : "")
}

export function useShotScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted: () => void
): ShotScreen {
  const state = useAppScreen(app, seeds, onStarted)
  const hosted = state.hosted ?? emptyHosted()
  const { form } = state
  const fields = useMemo(() => fieldsOfModel(hosted.chosen), [hosted.chosen])
  const isGraph = hosted.chosen === null || hosted.chosen.form === null
  const promptName = fields?.prompt?.name ?? graphPromptInput
  const [filled, setFilled] = useState(0)
  useWordsInPrompt(form, promptName, fields)
  const shot = sceneOf(form.values.inputs, promptName)
  const choose = chooseKeeping(form, promptName, hosted.choose)
  const kept: HostedState = { ...hosted, choose }
  const fillForm = state.useInputs
  return {
    state: { ...state, hosted: kept },
    hosted: kept,
    picker: shotPickerOf(kept, app),
    fields,
    isGraph,
    promptName,
    shot,
    words: wordsOf(shot.scene, shot.choices),
    start: startSlotOf(app, fields, isGraph),
    filled,
    setScene: (scene) => form.setInput(sceneInput, scene),
    setChoice: (list, value) => form.setInput(list, value),
    fillFromRun: (run) => {
      fillForm(run)
      keepScene(form, sceneOfRun(run, hosted.models))
      setFilled((count) => count + 1)
    },
  }
}
