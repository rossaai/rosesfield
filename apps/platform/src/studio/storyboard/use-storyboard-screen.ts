import type { AppListing, Run } from "@rosesfield/contract"
import { type KeyboardEvent, useCallback, useRef, useState } from "react"
import { t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  type FieldValue,
  type FormValues,
  valuesFromRun,
} from "@/screens/app/app-form"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import type { AppSeeds } from "@/screens/app/use-app-screen"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  referenceMessage,
  useReferenceFacts,
} from "@/studio/storyboard/reference-check"
import {
  lookMaxLength,
  maxScenes,
  sceneCountInput,
  sceneInputName,
  sceneMaxLength,
  sceneNumbers,
} from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

export type StoryboardState = {
  form: AppForm
  start: StartRun
  lastSeed: number | null
  hasRuns: boolean | null
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

const focusOrder = ["reference", ...sceneNumbers.map(sceneInputName), "look"]

function textOf(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function listOf(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

export function scenesOf(values: FormValues): string[] {
  const count = Math.min(Math.max(values.count, 1), maxScenes)
  return sceneNumbers
    .slice(0, count)
    .map((number) => textOf(values.inputs[sceneInputName(number)]))
}

export function withScenes(
  values: FormValues,
  scenes: readonly string[]
): FormValues {
  const count = Math.min(Math.max(scenes.length, 1), maxScenes)
  const inputs: Record<string, FieldValue> = {
    ...values.inputs,
    [sceneCountInput]: String(count),
  }
  for (const number of sceneNumbers) {
    inputs[sceneInputName(number)] = scenes[number - 1] ?? ""
  }
  return { ...values, inputs, count }
}

export function runValues(values: FormValues): FormValues {
  return withScenes(values, scenesOf(values))
}

export function messagesOf(
  values: FormValues,
  reference: string | null
): Map<string, string> {
  const messages = new Map<string, string>()
  const hasReference = listOf(values.inputs.reference).length > 0
  const hasCharacter = listOf(values.inputs.character).length > 0
  if (hasReference && hasCharacter) {
    messages.set("reference", tCatalog("storyboard.input.anchor.both"))
  } else if (reference !== null) {
    messages.set("reference", reference)
  }
  scenesOf(values).forEach((scene, index) => {
    const name = sceneInputName(index + 1)
    if (scene.trim() === "") {
      messages.set(name, t("field.prompt.required"))
    } else if (scene.length > sceneMaxLength) {
      messages.set(
        name,
        t("field.prompt.count", { count: scene.length, max: sceneMaxLength })
      )
    }
  })
  const look = textOf(values.inputs.look)
  if (look.length > lookMaxLength) {
    messages.set(
      "look",
      t("field.prompt.count", { count: look.length, max: lookMaxLength })
    )
  }
  return messages
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
  const runs = useAppRuns(app)
  const [isChecked, setChecked] = useState(false)
  const focusers = useRef(new Map<string, () => void>())
  const referenceId = textOf(listOf(form.values.inputs.reference)[0]) || null
  const facts = useReferenceFacts(referenceId)
  const reference = facts === null ? null : referenceMessage(facts)
  const runForm: AppForm = {
    ...form,
    values: runValues(form.values),
    validate: () => true,
  }
  const start = useStartRun(app, runForm, onStarted)
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
    start: { ...start, generate },
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    messages: shown,
    register,
    ...sceneEditing(form),
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
