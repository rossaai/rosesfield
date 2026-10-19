import { type AppListing, whenHolds } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { formatChoices } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import { problemsOf } from "@/screens/app/app-form"
import { inputUnit } from "@/screens/app/fields/input-copy"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  type AppScreenState,
  type AppSeeds,
  useAppScreen,
} from "@/screens/app/use-app-screen"
import type { StartRun } from "@/screens/app/use-start-run"
import {
  type ShotProblem,
  shotModelOf,
  shotProblems,
} from "../../../../../packages/catalog/src/shot/shot-models"
import { keyOf } from "../../../../../packages/catalog/src/shot/shot-words"

export type ShotScreenState = AppScreenState & {
  hasSound: boolean
  messages: ReadonlyMap<string, string>
  register: (name: string) => (focus: () => void) => void
}

function labelOf(app: AppListing, name: string, value: string): string {
  const input = app.inputs.find((one) => one.name === name)
  if (input?.type === "choice") {
    const option = input.options.find((one) => one.value === value)
    return option === undefined ? value : tCatalog(option.labelKey)
  }
  if (input?.type === "number") {
    return `${value} ${inputUnit(app, input)}`.trim()
  }
  return value
}

export function messageOf(app: AppListing, problem: ShotProblem): string {
  if (problem.kind === "required") {
    return tCatalog("shot.input.startFrame.required")
  }
  if (problem.kind === "unread") {
    return tCatalog("shot.input.startFrame.unread", {
      model: tCatalog(`shot.model.${keyOf(problem.model)}.name`),
    })
  }
  return tCatalog("shot.error.unsupported", {
    model: tCatalog(`shot.model.${keyOf(problem.model)}.name`),
    values: formatChoices(
      problem.takes.map((value) => labelOf(app, problem.input, value))
    ),
  })
}

function closest(values: readonly number[], target: number): number {
  return values.reduce(
    (best, value) =>
      Math.abs(value - target) < Math.abs(best - target) ? value : best,
    values[0] ?? target
  )
}

function useModelBounds(screen: AppScreenState): void {
  const { values, setInput } = screen.form
  const model = shotModelOf(values.inputs)
  const length = values.inputs.length
  const resolution = values.inputs.resolution
  const previous = useRef(model.id)
  useEffect(() => {
    if (previous.current === model.id) {
      return
    }
    previous.current = model.id
    if (typeof length === "number" && !model.lengths.includes(length)) {
      setInput("length", closest(model.lengths, length))
    }
    const largest = model.resolutions.at(-1)
    if (
      typeof resolution === "string" &&
      !model.resolutions.includes(resolution) &&
      largest !== undefined
    ) {
      setInput("resolution", largest)
    }
  }, [model, length, resolution, setInput])
}

const soundInput = "sound"

export function useSoundRule(app: AppListing, form: AppForm): boolean {
  const input = app.inputs.find((one) => one.name === soundInput)
  const sound = input?.type === "toggle" ? input : null
  const { values, setInput } = form
  const applies = sound !== null && whenHolds(sound.when, values.inputs)
  const value = values.inputs[soundInput]
  useEffect(() => {
    if (sound === null) {
      return
    }
    if (!applies && value !== undefined) {
      setInput(soundInput, undefined)
    }
    if (applies && value === undefined) {
      setInput(soundInput, sound.default)
    }
  }, [sound, applies, value, setInput])
  return applies
}

export type ShotScreenEvents = {
  onStarted: () => void
  onRefused: () => void
}

export function useShotScreen(
  app: AppListing,
  seeds: AppSeeds,
  events: ShotScreenEvents
): ShotScreenState {
  const screen = useAppScreen(app, seeds, events.onStarted)
  const { form } = screen
  const focusers = useRef(new Map<string, () => void>())
  const pendingFocus = useRef<string | null>(null)
  const [isChecked, setChecked] = useState(false)
  useModelBounds(screen)
  const hasSound = useSoundRule(app, form)
  const found = isChecked ? shotProblems(app, form.values.inputs) : []
  const messages = new Map(
    found.map((problem) => [problem.input, messageOf(app, problem)])
  )
  const generate = (): void => {
    const shot = shotProblems(app, form.values.inputs)
    const isValid = form.validate()
    if (shot.length === 0 && isValid) {
      setChecked(false)
      screen.start.generate()
      return
    }
    setChecked(true)
    const wrong = new Set([
      ...problemsOf(app, form.values).map((problem) => problem.name),
      ...shot.map((problem) => problem.input),
    ])
    const first = app.inputs.find((input) => wrong.has(input.name))
    pendingFocus.current = first?.name ?? null
    events.onRefused()
    if (first !== undefined) {
      focusers.current.get(first.name)?.()
    }
  }
  const start: StartRun = { ...screen.start, generate }
  const { register } = form
  const registerFor = useCallback(
    (name: string) => (focus: () => void) => {
      focusers.current.set(name, focus)
      register(name, focus)
      if (pendingFocus.current === name) {
        pendingFocus.current = null
        focus()
      }
    },
    [register]
  )
  return {
    ...screen,
    start,
    hasSound,
    messages,
    register: registerFor,
    onShortcut: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
