import type { AppListing, Run } from "@rosesfield/contract"
import { type KeyboardEvent, useCallback, useRef, useState } from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import type { FieldValue } from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import type { AppSeeds } from "@/screens/app/use-app-screen"
import type { StartRun } from "@/screens/app/use-start-run"
import {
  referenceMessage,
  useReferenceFacts,
} from "@/studio/storyboard/reference-check"
import {
  focusOrder,
  messagesOf,
  scenesOf,
  storyboardValuesFromRun,
  withScenes,
} from "@/studio/storyboard/storyboard-form"
import { useKeptForm } from "@/studio/storyboard/use-kept-form"
import { useStoryboardModel } from "@/studio/storyboard/use-storyboard-model"
import { useStoryboardStart } from "@/studio/storyboard/use-storyboard-start"
import {
  maxScenes,
  sceneInputName,
} from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

export type StoryboardState = {
  form: AppForm
  model: HostedState
  start: StartRun
  lastSeed: number | null
  scenes: readonly string[]
  messages: ReadonlyMap<string, string>
  setScene: (index: number, text: string) => void
  addScene: () => void
  removeScene: (index: number) => void
  moveScene: (index: number, by: -1 | 1) => void
  register: (name: string) => (focus: () => void) => void
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

function referenceIdOf(value: FieldValue): string | null {
  const first = Array.isArray(value) ? value[0] : undefined
  return first === undefined || first === "" ? null : first
}

function sceneEditing(form: AppForm) {
  const { values, fill } = form
  const write = (scenes: readonly string[]): void =>
    fill(withScenes(values, scenes))
  const scenes = scenesOf(values)
  return {
    scenes,
    setScene: (index: number, text: string) =>
      form.setInput(sceneInputName(index + 1), text),
    addScene: () => {
      if (scenes.length < maxScenes) {
        write([...scenes, ""])
      }
    },
    removeScene: (index: number) => {
      if (scenes.length > 1) {
        write(scenes.filter((_, at) => at !== index))
      }
    },
    moveScene: (index: number, by: -1 | 1) => {
      const target = index + by
      const moving = scenes[index]
      const other = scenes[target]
      if (moving === undefined || other === undefined) {
        return
      }
      const next = [...scenes]
      next[index] = other
      next[target] = moving
      write(next)
    },
  }
}

export function useStoryboardScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted: () => void
): StoryboardState {
  const form = useAppForm(app, seeds)
  useKeptForm(form, seeds)
  const runs = useAppRuns(app)
  const model = useStoryboardModel(app, form, runs.runs)
  const [isChecked, setChecked] = useState(false)
  const focusers = useRef(new Map<string, () => void>())
  const facts = useReferenceFacts(referenceIdOf(form.values.inputs.reference))
  const reference = facts === null ? null : referenceMessage(facts)
  const start = useStoryboardStart(app, form, model, onStarted)
  const found = messagesOf(form.values, reference)
  const shown = isChecked
    ? found
    : new Map(reference === null ? [] : [["reference", reference]])
  const generate = (): void => {
    if (found.size === 0) {
      setChecked(false)
      start.generate()
      return
    }
    setChecked(true)
    const first = focusOrder.find((name) => found.has(name))
    if (first !== undefined) {
      focusers.current.get(first)?.()
    }
  }
  const register = useCallback(
    (name: string) => (focus: () => void) => {
      focusers.current.set(name, focus)
    },
    []
  )
  return {
    form,
    model,
    start: { ...start, generate },
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    messages: shown,
    register,
    ...sceneEditing(form),
    useInputs: (run) => {
      setChecked(false)
      form.fill(storyboardValuesFromRun(app, run))
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
